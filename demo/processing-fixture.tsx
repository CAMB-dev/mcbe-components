import { CraftingTable, FuelIndicator, Furnace, ProcessingArrow } from '../src';

export function ProcessingFixture() {
  return <section aria-label="Processing reference specimens">
    <h2>Processing texture calibration</h2>
    <div className="calibration-grid">
      {[0, .5, 1].map(progress=><section className="calibration-case" key={`arrow-${progress}`}>
        <h3>Arrow {progress*100}%</h3><div className="calibration-stage" data-case={`processing-arrow-${progress*100}`}>
          <ProcessingArrow progress={progress} style={{backgroundColor:'#28292a'}}/>
        </div>
      </section>)}
      {[0, .5, 1].map(progress=><section className="calibration-case" key={`fuel-${progress}`}>
        <h3>Fuel {progress*100}%</h3><div className="calibration-stage" data-case={`fuel-${progress*100}`}>
          <FuelIndicator progress={progress} style={{backgroundColor:'#28292a'}}/>
        </div>
      </section>)}
      <section className="calibration-case"><h3>Empty furnace</h3><div className="calibration-stage" data-case="furnace-empty"><Furnace/></div></section>
      <section className="calibration-case"><h3>Empty crafting table</h3><div className="calibration-stage" data-case="crafting-empty"><CraftingTable/></div></section>
    </div>
  </section>;
}
