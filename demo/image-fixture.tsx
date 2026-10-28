import { useRef, useState } from 'react';
import { Image, NineSlice } from '../src/image';
import '../src/image.css';

// Unchanged Mojang PNG bytes, embedded for an offline fixture. Provenance and
// hashes are recorded in docs/image-geometry.json; not authored replacement art.
const button = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAACXBIWXMAAAsTAAALEwEAmpwYAAAFFmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNi4wLWMwMDIgNzkuMTY0NDg4LCAyMDIwLzA3LzEwLTIyOjA2OjUzICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjIuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDIxLTA1LTExVDEwOjQ4OjQ2LTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMS0wNS0xMVQxMDo0OTowNy0wNzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMS0wNS0xMVQxMDo0OTowNy0wNzowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpjYzE2ZDc2Ni03ZDdmLTQ5NGUtOTA0Ny00MTllOWViMTUwZGMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Y2MxNmQ3NjYtN2Q3Zi00OTRlLTkwNDctNDE5ZTllYjE1MGRjIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6Y2MxNmQ3NjYtN2Q3Zi00OTRlLTkwNDctNDE5ZTllYjE1MGRjIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpjYzE2ZDc2Ni03ZDdmLTQ5NGUtOTA0Ny00MTllOWViMTUwZGMiIHN0RXZ0OndoZW49IjIwMjEtMDUtMTFUMTA6NDg6NDYtMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyMi4wIChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7CjtDKAAAANUlEQVQImV3BsREAIAwDsYejyP47eBcyDzRuEnqkUVVtG4DcybJNRAwAST35rNyJpAa45/IAgfwXX5KGC6QAAAAASUVORK5CYII=';
const cell = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKAgMAAADwXCcuAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAlQTFRFNzc3i4uL////o1j30wAAABdJREFUeJxjYGAIYABh1tAFWHHUKjAGAJQqCcXGAJQxAAAAAElFTkSuQmCC';
const dialog = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAhCAYAAADUIPtUAAAAAklEQVR4AewaftIAAAC9SURBVK3BwXGDMBCG0W//UJGacAU6qQwaSCrQhSsVqA+2LEUZx2P7EALMvme865xj/DKe+sAZZsZgDB/c9YGzbrcb67p+Al8G9IEHd+eoWis/WmuIF+7OVSKICCKCiCAiiAgigoggIogIIoKIICKICCKCiCAiyMSOeZ55SClRSuEv4h/ubu5uy7KwRwSZ2JFSYtu2zgETO0opuDtHiCAiiLio1sor467nnLmqtYbx1HPOnNVaYzDjXec8Y/gGSPg0olRZzQgAAAAASUVORK5CYII=';
const arrow = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAPCAYAAADgbT9oAAAABGdBTUEAALGPC/xhBQAAAFRJREFUOMvN1MEKADAEBuB5Z2/BO1tua40D/pqLg/qSQGa2KqGqxswU1akDe47wNhzhI/ALH4NvfBQ+cRKRmpyE4xAY2zFsxt9vBWSPIZcH+RXZd9vQvF6G+ekC4gAAAABJRU5ErkJggg==';

export function ImageFixture() {
  const image=useRef<HTMLImageElement>(null), frame=useRef<HTMLDivElement>(null);
  const [events,setEvents]=useState('');
  return <section data-image-fixture aria-label="Source image primitives" style={{marginTop:24,background:'#28292a'}}>
    <h2 style={{fontSize:14,lineHeight:'20px',margin:'0 0 16px'}}>Source image primitives</h2>
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'start',gap:16}}>
      <Image ref={image} data-image-case="native" data-consumer="native-image" src={arrow} alt="Original workstation arrow" sourceSize={[22,15]} scale={2}/>
      <Image data-image-case="decorative" src={button} alt="" sourceSize={[4,4]} scale={3}/>
      <Image data-image-case="logical" src={cell} alt="Original cell at logical density" sourceSize={[10,10]} size={[5,5]} scale={2}/>
      <NineSlice ref={frame} data-image-case="cell" data-consumer="source-frame" src={cell} sourceSize={[10,10]} slice={2} destinationBorder={1} size={[18,18]} scale={2}/>
      <NineSlice data-image-case="button" src={button} sourceSize={[4,4]} slice={1} size={[20,14]} scale={3}/>
      <NineSlice data-image-case="asymmetric" src={dialog} sourceSize={[18,33]} slice={{left:8,top:23,right:8,bottom:8}} size={[50,45]}/>
      <NineSlice data-image-case="hollow" src={cell} sourceSize={[10,10]} slice={2} destinationBorder={1} size={[18,18]} scale={2} fill={false}/>
    </div>
    <div style={{display:'flex',alignItems:'start',gap:16,marginTop:16}}>
      <NineSlice data-image-case="content" src={button} sourceSize={[4,4]} slice={1} destinationBorder={{left:2,top:3,right:4,bottom:5}} scale={2} alt="Original Bedrock border">
        <button type="button" style={{display:'block',boxSizing:'border-box',width:80,height:24,padding:0,margin:0}} onClick={()=>setEvents('child activated')}>Frame action</button>
      </NineSlice>
      <NineSlice data-image-case="style" src={cell} sourceSize={[10,10]} slice={2} destinationBorder={1} size={[18,18]} scale={2} style={{width:44,height:40,padding:8}}/>
      <button type="button" onClick={()=>setEvents(`${image.current?.tagName}:${image.current?.width}|${frame.current?.tagName}:${frame.current?.clientWidth}`)}>Read image refs</button>
      <output aria-label="Image fixture events">{events}</output>
    </div>
  </section>;
}
