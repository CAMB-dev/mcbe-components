import type {ManifestValidationScreenProps} from '../src/manifest-validation-screen';
import type {ManifestValidationIssueData} from '../src/manifest-validation-parts';

/** Serializable host fixtures. Heights and text widths are explicit Web budgets,
 * not recovered engine CM/default-font metrics or a scan of installed packs. */
export function createManifestValidationDemoIssues(): ManifestValidationIssueData[] {
  return [
    {id:'example-manifest-error',index:0,type:'Error',content:'The example dependency identifier does not match the supplied manifest snapshot.',layout:{issueHeight:82,headerHeight:29,bodyHeight:38},payload:{fixture:true,category:'dependency'}},
    {id:'example-manifest-warning',index:1,type:'Warning',content:'This local fixture demonstrates a second entry in the vertical pack_errors collection.',layout:{issueHeight:88,headerHeight:29,bodyHeight:44},payload:{fixture:true,category:'content'}},
  ];
}

export function createManifestValidationDemoProps(): ManifestValidationScreenProps {
  return {
    open:true,viewportSize:[420,300],scale:2,title:'资源包验证报告',closeLabel:'关闭验证报告',
    content:{
      inputMode:'mouse',scrollLabel:'资源包验证报告内容',
      identity:{runKey:'example-validation-run-1',packId:'example-resource-pack',payload:{fixture:true}},
      state:{isWorking:false,isDeleting:false,isDoneValidating:true},
      summary:{icon:null,
        text:{title:'Example resource pack',size:'2.4 MB',description:'Local host report. Actions are delivered to the host.',id:'example-resource-pack',version:'1.0.0',path:'example/manifest.json'},
        labels:{id:'Pack ID',version:'Version',path:'Location',refresh:'Refresh',delete:'Delete'},
        visibility:{size:true,refresh:true,delete:true},
        layout:{summaryHeight:118,panelHeight:118,metadataHeight:68,metadataRowHeights:[18,18,18],metadataLabelWidths:[80,80,80],packSizeWidth:38},
      },
      entries:createManifestValidationDemoIssues(),capacity:2,hasErrorsOrWarnings:true,
      errorListLabel:'Issues',errorListHeaderHeight:16,issueLabel:'Info',copyLabel:'Copy issue',
      lowMemoryDevice:false,loadingFrame:0,
    },
  };
}
