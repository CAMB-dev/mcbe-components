import { Anvil } from '../src';

export function AnvilFixture() {
  return <section aria-label="Anvil reference states">
    <h2>Anvil reference states</h2>
    <div className="calibration-grid">
      <div className="calibration-stage" data-case="anvil-empty"><Anvil name=""/></div>
      <div className="calibration-stage" data-case="anvil-cost-success"><Anvil name="Tool" cost={{kind:'levels',levels:3}}/></div>
      <div className="calibration-stage" data-case="anvil-cost-fail"><Anvil name="Tool" cost={{kind:'levels',levels:3,affordable:false}}/></div>
      <div className="calibration-stage" data-case="anvil-cost-expensive"><Anvil name="Tool" cost={{kind:'too-expensive'}} invalid/></div>
      <div className="calibration-stage" data-case="anvil-invalid"><Anvil name="Tool" invalid/></div>
      <div className="calibration-stage" data-case="anvil-readonly"><Anvil name="Read only tool" renameReadOnly/></div>
      <div className="calibration-stage" data-case="anvil-disabled"><Anvil name="Unavailable tool" renameDisabled/></div>
    </div>
  </section>;
}
