import type {PackSettingsScreenProps} from '../src/pack-settings';

/** Serializable authored Web example, not a native provider/default snapshot.
 * Label heights are explicit logical Web budgets; no font measurement is claimed. */
export function createPackSettingsDemoProps():PackSettingsScreenProps {
  return {
    open:false,viewportSize:[420,300],scale:2,title:'资源包设置',closeLabel:'关闭设置',closeVisible:true,
    content:{
      inputMode:'mouse',scrollLabel:'资源包选项',
      tier:{
        hasContentTiering:true,contentTierSupported:true,label:'内容等级：标准',incompatibleReason:'此内容等级与当前设备不兼容。',
        value:.6,steps:4,ttsText:'标准内容等级',labelHeight:10,reasonHeight:20,
        web:{value:25,min:10,max:50,step:5,markers:[{offset:0,progress:true},{offset:80,progress:true},{offset:150,progress:false}]},
      },
      generated:{customFormLength:9,contents:{fields:[
        {id:'appearance-heading',type:'header',text:'显示设置'},
        {id:'appearance-description',type:'label',text:'调整当前资源包的本地预览选项。'},
        {id:'appearance-divider',type:'divider'},
        {id:'profile-name',type:'input',label:'配置名称',defaultValue:'默认配置'},
        {id:'animated-details',type:'toggle',label:'动态细节',defaultValue:true},
        {id:'detail-distance',type:'slider',label:'细节距离',min:2,max:8,step:2,defaultValue:4},
        {id:'texture-detail',type:'step_slider',label:'纹理细节',options:[{value:'low',label:'低'},{value:'standard',label:'标准'},{value:'high',label:'高'}],defaultValue:'standard'},
        {id:'color-profile',type:'dropdown',label:'色彩方案',options:[{value:'original',label:'原始'},{value:'soft',label:'柔和'}],defaultValue:'original'},
        {id:'visible-details',type:'multiselect',label:'显示内容',options:[{value:'particles',label:'粒子'},{value:'weather',label:'天气'},{value:'foliage',label:'植被'}],defaultValue:['particles','weather'],defaultExpanded:false},
      ]}},
    },
  };
}
