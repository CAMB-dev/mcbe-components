import { useLayoutEffect, useState } from 'react';
import { Select } from '../src';
import { hasClassicFonts, hasGameFont } from 'virtual:mcbeui-game-font';
import '../src/classic-fonts.css';

export type DemoFontProfile = 'classic' | 'local' | 'open';
const managedClasses = ['mc-classic-fonts', 'demo-font-local', 'demo-font-open'] as const;

/** The demo owns one explicit document theme so portals share its font. */
export function useDemoFontProfile() {
  const [profile, setProfile] = useState<DemoFontProfile>(hasClassicFonts ? 'classic' : hasGameFont ? 'local' : 'open');
  useLayoutEffect(() => {
    const root = document.documentElement, previous = managedClasses.filter(name => root.classList.contains(name));
    const previousProfile = root.getAttribute('data-demo-font-profile');
    root.classList.remove(...managedClasses);
    root.classList.add(profile === 'classic' ? 'mc-classic-fonts' : `demo-font-${profile}`);
    root.setAttribute('data-demo-font-profile', profile);
    return () => {
      root.classList.remove(...managedClasses); root.classList.add(...previous);
      if (previousProfile === null) root.removeAttribute('data-demo-font-profile');
      else root.setAttribute('data-demo-font-profile', previousProfile);
    };
  }, [profile]);
  return { profile, setProfile };
}

export function ClassicFontExamples({ profile, onProfileChange }: {
  profile: DemoFontProfile; onProfileChange: (profile: DemoFontProfile) => void;
}) {
  return <div className="classic-font-picker" data-classic-font-picker>
    <Select label="Font profile" value={profile} onChange={event => onProfileChange(event.target.value as DemoFontProfile)}
      options={[
        ...(hasClassicFonts ? [{ value: 'classic', label: 'Classic bitmap glyphs · local' }] : []),
        ...(hasGameFont ? [{ value: 'local', label: 'Mojangles TTF · local' }] : []),
        { value: 'open', label: 'Open pixel fonts · bundled' },
      ]}/>
    <p>{profile === 'classic'
      ? 'Prepared bitmap glyphs across text, inputs and menus; other characters use fallback fonts. These local fonts stay outside the package. Browser rasterization still differs from the game.'
      : profile === 'local'
        ? 'Mojangles from your game supplies Latin glyphs. Chinese uses the bundled open font.'
        : 'The package includes open fonts for Latin and simplified Chinese. Their designs differ from the original game.'}</p>
    {!hasClassicFonts && <p>Prepare the optional original bitmap fonts with <code>python scripts/prepare-classic-fonts.py</code>, then restart the preview.</p>}
  </div>;
}
