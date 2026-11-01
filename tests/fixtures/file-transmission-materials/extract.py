from pathlib import Path
import zipfile, hashlib, json
root=Path(__file__).parent
archive=Path('.cache/references/bedrock-samples-v1.26.60.5-full.zip')
textures=['dialog_background_hollow_2','control','experiencebarempty','experiencebarfull','experiencenub','button_borderless_light','button_borderless_lighthover','button_borderless_lightpressed','disabledButtonNoBorder','focus_border_white','title','title_edu','title_edu_preview','Black','edu_green_tile']
pins=json.loads((root/'RAW-SOURCE-PINS.json').read_text(encoding='utf-8-sig'))
rows=[]
with zipfile.ZipFile(archive) as z:
    names=set(z.namelist())
    for tex in textures:
        row={'texture':'textures/ui/'+tex,'files':[]}
        for ext in ['.png','.json']:
            suffix='resource_pack/textures/ui/'+tex+ext
            matches=[n for n in names if n.endswith(suffix)]
            if len(matches)>1: raise ValueError(matches)
            if not matches:
                row['files'].append({'member':suffix,'absent':True}); continue
            member=matches[0]; raw=z.read(member); out=root/'ORIGINALS'/suffix
            out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(raw)
            row['files'].append({'member':member,'saved':str(out.relative_to(root)).replace('\\','/'),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        rows.append(row)
    # Read-only namespace/declaration inventory: no inference from implementation.
    inventory=[]
    for n in sorted(names):
        if '/ui/' in n and n.endswith('.json'):
            raw=z.read(n).decode('utf-8-sig')
            if any(s in raw for s in ['"namespace": "common_dialogs"','"namespace": "common_store"']):
                suffix=n[n.index('resource_pack/'):];out=root/'ORIGINALS'/suffix
                out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(z.read(n))
                inventory.append({'member':n,'saved':str(out.relative_to(root)).replace('\\','/'),'bytes':len(z.read(n)),'sha256':hashlib.sha256(z.read(n)).hexdigest()})
(root/'MATERIAL-RAW-PINS.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
(root/'ADDITIONAL-SOURCE-PINS.json').write_text(json.dumps(inventory,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'materials':len(rows),'extraSources':inventory},indent=2))
