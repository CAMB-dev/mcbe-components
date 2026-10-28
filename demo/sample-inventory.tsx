import type { InventoryItem } from '../src';
import { GameItemIcon } from './materials';

export const sampleSword: InventoryItem = { name: 'Diamond sword', icon: <GameItemIcon name="sword"/>, durability: .42 };
export const sampleInventory: readonly (InventoryItem | null)[] = [
  sampleSword,
  { name: 'Diamond', icon: <GameItemIcon name="diamond"/>, count: 64 },
  { name: 'Apple', icon: <GameItemIcon name="apple"/>, count: 8 },
  { name: 'Lapis lazuli', icon: <GameItemIcon name="lapis"/>, count: 32 },
  { name: 'Coal', icon: <GameItemIcon name="coal"/>, count: 16 },
  { name: 'Emerald', icon: <GameItemIcon name="gem"/>, count: 16 },
  { name: 'Stick', icon: <GameItemIcon name="stick"/>, count: 4 },
  null,
  { name: 'Steak', icon: <GameItemIcon name="steak"/>, count: 2 },
];
