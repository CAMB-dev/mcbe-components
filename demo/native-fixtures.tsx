import type { ReactNode } from 'react';
import { BrewingIndicator, BrewingStand } from '../src/brewing';
import { CartographyTable, SmithingTable } from '../src/special-workstations';
import { AirBar, ArmorBar, Crosshair, ExperienceBar, HealthBar, Hotbar, HungerBar } from '../src/hud';

function Sample({ id, children, wide = false }: { id: string; children: ReactNode; wide?: boolean }) {
  return <section className="calibration-case" style={wide ? { gridColumn: '1 / -1', minWidth: 0 } : undefined}>
    <h2>{id}</h2><div className="calibration-stage" role="region" aria-label={`${id} specimen scroll area`} tabIndex={0} data-case={id} style={{ background: '#28292a', maxWidth: '100%', minWidth: 0, overflowX: 'auto' }}>{children}</div>
  </section>;
}

/** Original-source comparison specimens; all controls retain GUI scale2. */
export function NativeFixtures() {
  return <>
    <Sample id="brewing-empty" wide><BrewingStand/></Sample>
    <Sample id="brewing-scene-half" wide><BrewingStand progress={.5} bubbles={.5} fuelRemaining={.5}/></Sample>
    {(['arrow', 'bubbles', 'fuel'] as const).flatMap(variant => [0, .5, 1].map(progress =>
      <Sample key={`${variant}-${progress}`} id={`brewing-${variant}-${progress * 100}`}>
        <BrewingIndicator variant={variant} progress={progress}/>
      </Sample>))}
    <Sample id="smithing-empty-native" wide><SmithingTable overlayFrame={0}/></Sample>
    {[0, 1].map(frame => <Sample key={frame} id={`smithing-atlas-frame${frame}`} wide>
      <SmithingTable overlayFrame={frame} baseOverlay="armors-and-tools" materialOverlay="all"/>
    </Sample>)}
    {(['none', 'clone', 'rename', 'basic', 'locator', 'extend', 'locked'] as const).map(mode =>
      <Sample key={mode} id={`cartography-mode-${mode}`} wide><CartographyTable mode={mode}/></Sample>)}
    <Sample id="hud-health"><HealthBar value={1}/></Sample>
    <Sample id="hud-hunger"><HungerBar value={1}/></Sample>
    <Sample id="hud-armor"><ArmorBar value={1}/></Sample>
    <Sample id="hud-air"><AirBar states={['full', 'pop', 'empty', 'hidden']}/></Sample>
    {[0, .5, 1].map(progress => <Sample key={progress} id={`hud-xp-${progress * 100}`} wide>
      <ExperienceBar progress={progress} showLevel={false}/>
    </Sample>)}
    <Sample id="hud-xp-level" wide><ExperienceBar progress={.5} level={30}/></Sample>
    <Sample id="hud-hotbar-empty" wide><Hotbar items={[]} defaultSelectedIndex={0}/></Sample>
    <Sample id="hud-crosshair"><Crosshair/></Sample>
  </>;
}
