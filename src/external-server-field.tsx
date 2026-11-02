import {forwardRef,useId} from 'react';
import type {CSSProperties,InputHTMLAttributes} from 'react';
import {ClassicSkin} from './classic-skin';
import {externalServerAssets} from './external-server-assets';
import {useClassicNodeRef} from './classic-screen-lifecycle';

export interface ExternalServerFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>,'size'|'width'|'height'|'type'|'children'|'value'|'defaultValue'> {
  readonly kind:'name'|'address'|'port';
  readonly label:string;
  readonly scale?:number;
  /** Logical source row width, before scale. */
  readonly width?:number;
  readonly value?:string;
  readonly defaultValue?:string;
}

/** Source text_edit_group: label10 + edit25 + trailing3. This uses a real native
 * input and ref; className/style apply to that input, not the fixed source row.
 * Browser editing/selection/IME are retained. Source NumberChars only supplies
 * the Web numeric keyboard hint; it never filters or parses the port value. */
export const ExternalServerField=forwardRef<HTMLInputElement,ExternalServerFieldProps>(function ExternalServerField({
  kind,label,scale=2,width=295,value,defaultValue,id:providedId,className='',style,maxLength,inputMode,disabled,readOnly,spellCheck,...native
},ref){
  if(!['name','address','port'].includes(kind))throw new TypeError('ExternalServerField kind must be name, address or port');
  if(typeof label!=='string')throw new TypeError('ExternalServerField label must be text');
  if(!Number.isSafeInteger(scale)||scale<1||!Number.isFinite(width)||width<=6||width*scale>8192||38*scale>8192||width*38*scale*scale>4194304)throw new RangeError('ExternalServerField requires positive integer scale and a finite width with source inner fill, within the Web extent budget');
  const autoId=useId(),id=providedId??`mc-external-server-${autoId}`,[,attach]=useClassicNodeRef(ref);
  const defaultMaxLength=kind==='name'?16:kind==='address'?256:6;
  return <div className="mc-external-server-field" data-source-control="add_external_server.text_edit_group" data-field-kind={kind} data-native-certified="false"
    style={{width:width*scale,height:38*scale,'--mc-external-server-unit':`${scale}px`} as CSSProperties}>
    <label className="mc-external-server-field__label" htmlFor={id}>{label}</label>
    <div className="mc-external-server-field__editor" data-disabled={disabled||undefined}>
      <span className="mc-external-server-field__skin mc-external-server-field__skin--normal" aria-hidden="true"><ClassicSkin asset={externalServerAssets.edit_box_indent} width={width} height={25} scale={scale} baseClass="mc-external-server-skin" errorName="External server editor"/></span>
      <span className="mc-external-server-field__skin mc-external-server-field__skin--hover" aria-hidden="true"><ClassicSkin asset={externalServerAssets.edit_box_indent_hover} width={width} height={25} scale={scale} baseClass="mc-external-server-skin" errorName="External server editor"/></span>
      <div className="mc-external-server-field__input-clip"><input {...native} ref={attach} id={id} type="text" value={value} defaultValue={defaultValue} maxLength={maxLength??defaultMaxLength}
        inputMode={inputMode??(kind==='port'?'numeric':undefined)} disabled={disabled} readOnly={readOnly} spellCheck={spellCheck??false}
        className={`mc-external-server-field__input ${className}`} style={style} data-source-control="common.text_edit_box"
        data-source-text-type={kind==='port'?'NumberChars':'ExtendedASCII'} data-web-text-policy="native-unfiltered"/></div>
    </div>
  </div>;
});
