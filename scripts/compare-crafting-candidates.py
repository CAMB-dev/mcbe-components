"""Recompute a frozen Crafting A/E study with a stdlib PNG decoder.

The complete framebuffer is always scored. --region only classifies changes;
it cannot remove pixels from the primary comparison. No images are rewritten.
"""
import argparse
from array import array
import hashlib
import json
from pathlib import Path
import struct
import sys
import zlib

def sha(data):
    return hashlib.sha256(data).hexdigest()

def rgba_png(path):
    data=Path(path).read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Not PNG: '+str(path))
    pos=8;compressed=[];header=None;ended=False
    while pos<len(data):
        if pos+12>len(data):raise ValueError('Truncated PNG chunk')
        length=struct.unpack_from('>I',data,pos)[0];tag=data[pos+4:pos+8];end=pos+8+length
        if end+4>len(data):raise ValueError('Truncated PNG payload')
        payload=data[pos+8:end]
        if zlib.crc32(tag+payload)&0xffffffff!=struct.unpack_from('>I',data,end)[0]:raise ValueError('PNG CRC mismatch')
        if tag==b'IHDR':
            if header is not None or length!=13:raise ValueError('Invalid IHDR')
            header=struct.unpack('>IIBBBBB',payload)
        elif tag==b'IDAT':compressed.append(payload)
        elif tag==b'IEND':ended=True;pos=end+4;break
        pos=end+4
    if not ended or pos!=len(data) or not header:raise ValueError('Incomplete PNG')
    w,h,depth,color,compression,filtering,interlace=header
    if not(0<w<=8192 and 0<h<=8192 and w*h<=16777216):raise ValueError('Framebuffer budget')
    if (depth,color,compression,filtering,interlace)!=(8,6,0,0,0):raise ValueError('Only unmodified RGBA8 noninterlaced target PNGs are supported')
    stride=w*4;size=h*(stride+1);decoder=zlib.decompressobj();raw=decoder.decompress(b''.join(compressed),size+1)
    if len(raw)!=size or not decoder.eof or decoder.unused_data:raise ValueError('Invalid or oversized PNG deflate data')
    output=bytearray(stride*h);previous=bytearray(stride)
    for y in range(h):
        offset=y*(stride+1);kind=raw[offset];row=bytearray(raw[offset+1:offset+1+stride])
        if kind>4:raise ValueError('Invalid PNG row filter')
        for i in range(stride):
            left=row[i-4] if i>=4 else 0;up=previous[i];corner=previous[i-4] if i>=4 else 0
            if kind==1:predict=left
            elif kind==2:predict=up
            elif kind==3:predict=(left+up)//2
            elif kind==4:
                p=left+up-corner;a=abs(p-left);b=abs(p-up);c=abs(p-corner)
                predict=left if a<=b and a<=c else up if b<=c else corner
            else:predict=0
            row[i]=(row[i]+predict)&255
        output[y*stride:(y+1)*stride]=row;previous=row
    return w,h,bytes(output)

def load(path):return json.loads(Path(path).read_text(encoding='utf-8'))

def delta(a,b,path=''):
    if type(a)!=type(b):return [path]
    if isinstance(a,dict):return sum((delta(a.get(k),b.get(k),path+'/'+k) for k in sorted(a.keys()|b.keys())),[])
    if isinstance(a,list):return [path] if len(a)!=len(b) else sum((delta(x,y,path+'/'+str(i)) for i,(x,y) in enumerate(zip(a,b))),[])
    return [] if a==b else [path]

def pixels(raw):
    result=array('I',raw)
    if result.itemsize!=4:raise ValueError('32-bit array required')
    if sys.byteorder!='little':result.byteswap()
    return result

def score(a,b):
    changed=alpha=channel_bytes=absolute=maximum=0
    for x,y in zip(a,b,strict=True):
        if x==y:continue
        changed+=1;alpha+=int((x>>24)!=(y>>24))
        for shift in [0,8,16,24]:
            d=abs(((x>>shift)&255)-((y>>shift)&255));channel_bytes+=int(d!=0);absolute+=d;maximum=max(maximum,d)
    return {'rgbaPixels':changed,'alphaPixels':alpha,'differentBytes':channel_bytes,'absoluteError':absolute,'maxChannelError':maximum}

def compare(study,region):
    frozen=load(study/'FROZEN.json');execution=load(study/'EXECUTION02.json')
    if execution['status']!='BOTH_FROZEN_ARMS_EXECUTED_FULL_TARGET' or not execution['closed']:raise ValueError('Incomplete execution')
    if [a['arm'] for a in execution['arms']]!=['A','E']:raise ValueError('Expected two independently recorded arms')
    arms=[];configs=[];references=[]
    for entry in execution['arms']:
        report_path=Path(entry['report']);r=load(report_path);cfg_path=Path(r['inputPath']);cfg_bytes=cfg_path.read_bytes();cfg=json.loads(cfg_bytes)
        if sha(cfg_bytes)!=frozen[entry['arm']+'sha256'] or sha(cfg_bytes)!=r['inputSha256']:raise ValueError('Frozen input drift')
        if not(r['completed'] and r['runtimeErrorsClean'] and not r['changedPins'] and r['sourceBefore']==r['sourceAfter']) or any(r[k] for k in ['pageErrors','consoleErrors','requestsFailed']):raise ValueError('Runtime/source guard failed')
        for p,h in r['sourceAfter'].items():
            if sha(Path(p).read_bytes())!=h:raise ValueError('Current source drift: '+p)
        if len(r['cases'])!=1 or not r['cases'][0]['markerContract']:raise ValueError('Actual product source markers unavailable')
        case=r['cases'][0];renderers={x['renderer'] for x in case['layout']['canvases'] if x['renderer']}
        if not renderers or any('NVIDIA' not in x or 'D3D11' not in x for x in renderers):raise ValueError('Actual NVIDIA D3D11 backend required')
        w,h,actual=rgba_png(report_path.parent/(case['mode']+'-full.png'))
        if (w,h)!=(cfg['frame']['width'],cfg['frame']['height']) or sha(actual)!=case['rgbaSha256']:raise ValueError('Actual complete PNG identity')
        nw,nh,native=rgba_png(cfg['native']['postPng']);cw,ch,copy=rgba_png(report_path.parent/'native-reference-full.png')
        if (nw,nh)!=(w,h) or (cw,ch)!=(w,h) or native!=copy or sha(native)!=cfg['native']['rgbaSha256']:raise ValueError('Native whole-frame/copy guard')
        if sha(Path(cfg['native']['postPng']).read_bytes())!=cfg['native']['pngSha256']:raise ValueError('Native original PNG identity')
        arms.append(pixels(actual));configs.append(cfg);references.append(native)
    if references[0]!=references[1]:raise ValueError('Different native targets')
    if sha(arms[0].tobytes())!=frozen['historicalDRGBA']:raise ValueError('Current baseline is not entire historical D RGBA')
    changes=delta(configs[0],configs[1]);prefix='/scene/recipeBook/entries/3/modelSpec/'
    if not changes or any(not p.startswith(prefix) for p in changes):raise ValueError('Unexpected non-pane input change: '+str(changes))
    native=pixels(references[0]);a,e=arms;x0,y0,rw,rh=region
    if min(x0,y0)<0 or min(rw,rh)<=0 or x0+rw>w or y0+rh>h:raise ValueError('Diagnostic rectangle outside target')
    transition={'resolved':0,'newlyDifferent':0,'bothWrongChanged':0,'bothWrongUnchanged':0,'AtoEChangedPixels':0,'outsideRegionChangedPixels':0}
    bins={name:[] for name in ['A','E','native']}
    for i,(av,ev,nv) in enumerate(zip(a,e,native,strict=True)):
        aa=av!=nv;ee=ev!=nv;different=av!=ev;inside=x0<=i%w<x0+rw and y0<=i//w<y0+rh
        transition['resolved']+=int(aa and not ee);transition['newlyDifferent']+=int(not aa and ee)
        transition['bothWrongChanged']+=int(aa and ee and different);transition['bothWrongUnchanged']+=int(aa and ee and not different)
        transition['AtoEChangedPixels']+=int(different);transition['outsideRegionChangedPixels']+=int(different and not inside)
        if inside:
            for key,value in [('A',av),('E',ev),('native',nv)]:bins[key].append(value)
    return {'status':'COMPLETE_TARGET_RECOMPUTED_NOT_EXACT','framePixels':w*h,'A':score(a,native),'E':score(e,native),'AtoE':score(a,e),'transitions':transition,'diagnosticRegion':region,'regionA':score(bins['A'],bins['native']),'regionE':score(bins['E'],bins['native']),'baselineHistoricalRGBAEqual':True,'sourcePins':len(configs[0]['pins']),'ordinaryInputChanges':changes,'independentDecoder':'Python standard-library PNG chunk CRC/deflate/row reconstruction; does not use browser/PNGjs/Pillow','nativeMasksOrTolerance':False,'wholePageNativeQualified':False}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--study',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--region',type=int,nargs=4,required=True);args=parser.parse_args()
    try:
        if args.output.exists():raise ValueError('Choose a fresh evidence directory')
        result=compare(args.study,args.region);args.output.mkdir(parents=True,exist_ok=False);(args.output/'RESULT.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))
    except (AssertionError,ValueError,KeyError,OSError) as error:
        print(json.dumps({'status':'AUDIT_FAILED','error':str(error)}));sys.exit(1)
