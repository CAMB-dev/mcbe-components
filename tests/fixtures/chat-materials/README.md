# Frozen Chat material references

These eleven complete RGBA planes were calculated independently from the fixed
official Bedrock `v1.26.60.5-full` archive before browser measurement. They are
material references, not native screen captures or whole-GUI certification.
Archive SHA256: `d93dea9aa1fb241a3184cc9f9a074a2ff34bd1b3c00d859b09c24b4b9e4e9adf`.

`PROTOCOL.json` retains the original source member names, byte identities, raw
nine-slice metadata, source clauses, integer boxes, binary alpha and rational
POINT sampling rules. Its SHA256 is
`0fa39e3481b4c1b5dc5d49dcaedff75c34864659f5deb69eadb9f15c09329020`.
`PLANES.json` pins the complete PNG and decoded RGBA identities. Its paths name
the original freeze location; the tests use the identical adjacent PNG bytes.
No production renderer, screenshot, computed style or measured target pixel
was used to calculate the expected planes. Do not regenerate them from browser
output or relax zero tolerance to make a mismatch pass.

The explicit Web geometry is 500 logical units wide, scale 1. Keyboard controls
are 27x27, editor 396x27, shell 252x160 and toggles 30x16. External backing is
`#203040`; transparent toggle pixels reveal the actual source shell `#313131`.
Normal/hover/pressed/locked are separate planes, with original icons.

Predeclared paint isolation preserves every box: editor measurements hide only
the send sibling's paint (`visibility:hidden`) while retaining its 50-unit
flow box and -20-unit offset. Shell measurements hide title/close/scroller
paint, retaining their layout. No pixel masks, ROI cropping, tolerance or
paint isolation applies to toggle planes. Full natural screenshots and font,
layout, input and modal contracts are checked separately.
