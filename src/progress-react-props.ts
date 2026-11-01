import {PROGRESS_WEB_LIMITS} from './progress-data';

/** React18 development props may contain nonenumerable key/ref warning getters.
 * They are framework metadata, not model data. Identify them by descriptors;
 * never spread props or evaluate an accessor to remove these two markers. */
export function projectProgressElementProps<T extends object>(value:T):T{
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new TypeError('Progress element props require a plain data record');
 const keys=Reflect.ownKeys(value);
 if(keys.length>PROGRESS_WEB_LIMITS.recordFields+2)throw new RangeError('Progress element props exceed the finite property budget');
 const result:Record<string,unknown>=Object.create(null);
 for(const key of keys){
  const field=Object.getOwnPropertyDescriptor(value,key);
  if((key==='key'||key==='ref')&&field&&!field.enumerable&&typeof field.get==='function'&&field.set===undefined
   &&Object.getOwnPropertyDescriptor(field.get,'isReactWarning')?.value===true)continue;
  if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!field?.enumerable||!('value'in field))throw new TypeError('Progress element props require own enumerable data props');
  result[key]=field.value;
 }
 if(Object.keys(result).length>PROGRESS_WEB_LIMITS.recordFields)throw new RangeError('Progress element props exceed the finite data-field budget');
 return result as T;
}
