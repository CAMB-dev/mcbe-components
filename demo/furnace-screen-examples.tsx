import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, ReactNode} from 'react';
import {Button, Combobox, Switch} from '../src';
import {FurnaceScreen, BlastFurnaceScreen, SmokerScreen, FurnaceScreenFrame} from '../src/furnace-screen';
import type {FurnaceScreenLayout} from '../src/furnace-screen';
import {FurnaceRecipeBook, FurnaceRecipeBookEntry, FurnaceRecipeFilterToggle, FurnaceRecipeCategoryTabs} from '../src/furnace-recipe-book';
import type {FurnaceRecipeBookProps} from '../src/furnace-recipe-book';
import {Furnace} from '../src/processing';
import type {InventoryItem} from '../src/inventory';
import {hasGameFont} from 'virtual:mcbeui-game-font';
import '../src/fonts.css';
import '../src/furnace-screen.css';
import '../src/furnace-recipe-book.css';

type Category = FurnaceRecipeBookProps['categoryId'];
type Kind = 'furnace' | 'blast' | 'smoker';
const titles = {furnace: '熔炉', blast: '高炉', smoker: '烟熏炉'};
const art = {
  beef: new URL('./assets/minecraft/beef_cooked.png', import.meta.url).href,
  rawBeef: new URL('./assets/minecraft/beef_raw.png', import.meta.url).href,
  iron: new URL('./assets/minecraft/iron_ingot.png', import.meta.url).href,
  gold: new URL('./assets/minecraft/gold_ingot.png', import.meta.url).href,
  coal: new URL('./assets/minecraft/coal.png', import.meta.url).href,
  stone: new URL('../src/assets/item-renderers/stone.png', import.meta.url).href,
};
const categoryLabels = {food: '食物', items: '物品', blocks: '方块', search: '搜索'};
const catalog = [
  {id: 'cooked-beef', label: '熟牛肉', category: 'food', available: true, item: {name: '熟牛肉', image: art.beef}},
  {id: 'iron', label: '铁锭', category: 'items', available: true, item: {name: '铁锭', image: art.iron}},
  {id: 'gold', label: '金锭', category: 'items', available: false, item: {name: '金锭', image: art.gold}},
  {id: 'stone', label: '石头', category: 'blocks', available: true, item: {name: '石头', image: art.stone}},
] as const;
function Viewport({children, label, top = 8}: {children: ReactNode; label: string; top?: number}) {
  return <div role="region" aria-label={label} tabIndex={0} style={{maxWidth: '100%', minWidth: 0, overflowX: 'auto', padding: `${top}px 8px 12px`, boxSizing: 'border-box', background: '#203040'}}>{children}</div>;
}

export function FurnaceScreenExamples() {
  const [layouts, setLayouts] = useState<Record<Kind, FurnaceScreenLayout>>({furnace: 'recipe-book', blast: 'recipe-book', smoker: 'recipe-book'});
  const [closed, setClosed] = useState<Record<Kind, boolean>>({furnace: false, blast: false, smoker: false});
  const [lastClosed, setLastClosed] = useState<Kind | null>(null);
  const reopen = useRef<Record<Kind, HTMLButtonElement | null>>({furnace: null, blast: null, smoker: null});
  const [category, setCategory] = useState<Category>('food'), [query, setQuery] = useState(''), [filtering, setFiltering] = useState(false), [inventoryTab, setInventoryTab] = useState(false);
  const [bindingMode, setBindingMode] = useState('all'), [accept, setAccept] = useState(true), [bookDisabled, setBookDisabled] = useState(false), [toolbarDisabled, setToolbarDisabled] = useState(false), [filterReadOnly, setFilterReadOnly] = useState(false);
  const [selected, setSelected] = useState('cooked-beef'), [progress, setProgress] = useState(.5), [ready, setReady] = useState(false);
  const [status, setStatus] = useState('选择配方或操作工具栏。此预览不会运行烧炼。');
  useEffect(() => {
    let active = true;
    Promise.all([document.fonts.load('20px "MCBE Pixel"', 'Furnace'), document.fonts.load('20px "MCBE CJK"', '熔炉配方'), ...(hasGameFont ? [document.fonts.load('20px "Mojangles Pixel"'), document.fonts.load('20px "Mojangles"')] : [])])
      .then(() => document.fonts.ready).then(() => {if (active) setReady(true);}).catch(() => {if (active) setReady(true);});
    return () => {active = false;};
  }, []);
  useEffect(() => {if (lastClosed && closed[lastClosed]) reopen.current[lastClosed]?.focus({preventScroll: true});}, [closed, lastClosed]);
  const bindings: FurnaceRecipeBookProps['categoryBindings'] = {
    food: {visible: bindingMode === 'all'},
    items: {leftmostVisible: bindingMode === 'no-food', normalVisible: bindingMode === 'all'},
    blocks: {leftmostVisible: bindingMode === 'blocks-only', normalVisible: bindingMode === 'all' || bindingMode === 'no-food'},
  };
  const entries = catalog.filter(entry => (category === 'search' || entry.category === category) && (!filtering || entry.available) && (!query || entry.label.toLowerCase().includes(query.toLowerCase())));
  const book: FurnaceRecipeBookProps = {
    title: category === 'search' ? '搜索配方' : `${categoryLabels[category]}配方`, entries,
    categoryId: category, query, filteringEnabled: filtering, inventoryTab, categoryBindings: bindings, categoryLabels, disabled: bookDisabled,
    selectedId: selected, searchLabel: '搜索烧炼配方', searchPlaceholder: '输入配方名称', filterLabel: '只显示可用配方', recipesLabel: '烧炼配方', categoriesLabel: '烧炼分类', emptyLabel: '没有匹配的配方',
    onCategoryChange: next => {if (accept) {setCategory(next); setQuery('');} setStatus(`已收到分类请求：${categoryLabels[next]}${accept ? '' : '，宿主保留原值'}`);},
    onQueryChange: next => {if (accept) setQuery(next); setStatus(`已收到搜索文字：${next}${accept ? '' : '，宿主保留原值'}`);},
    onFilteringEnabledChange: next => {if (accept) setFiltering(next); setStatus(`已收到过滤请求：${next ? '开启' : '关闭'}${accept ? '' : '，宿主保留原值'}`);},
    onRecipeAction: (id, action) => {if (accept) setSelected(id); setStatus(`已收到配方请求：${id} · ${action}；此预览未开始烧炼。`);},
  };
  const processing = (kind: Kind) => ({
    input: kind === 'blast' ? null : {name: '生牛肉', image: art.rawBeef, count: 8},
    fuel: {name: '煤炭', image: art.coal, count: 16}, result: {name: kind === 'blast' ? '铁锭' : '熟牛肉', image: kind === 'blast' ? art.iron : art.beef},
    progress, fuelRemaining: .75, inventory: [{name: '煤炭', image: art.coal, count: 32}, {name: '铁锭', image: art.iron, count: 3}] as InventoryItem[],
    hotbar: [{name: '生牛肉', image: art.rawBeef, count: 8}], inventoryLabel: '物品栏',
    onInputAction: (slot: string, action: string) => setStatus(`已收到${titles[kind]}槽位请求：${slot} · ${action}`),
    onInventoryAction: (index: number, action: string) => setStatus(`已收到物品栏请求：${index} · ${action}`),
    onTakeResult: (action: string) => setStatus(`已收到${titles[kind]}结果请求：${action}；预览物品未变化。`),
  });
  return <div data-testid="furnace-screen-demo" style={{display: 'grid', gap: 20, minWidth: 0, '--mc-font': hasGameFont ? '"Mojangles Pixel","Mojangles","MCBE CJK",monospace' : '"MCBE Pixel","MCBE CJK",monospace', '--mc-font-size': '20px'} as CSSProperties}>
    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 12}}>
      <Combobox label="分类绑定" value={bindingMode} options={[{value: 'all', label: '全部分类'}, {value: 'no-food', label: '物品使用左端样式'}, {value: 'blocks-only', label: '方块使用左端样式'}]} onValueChange={next => {setBindingMode(next); setCategory(next === 'blocks-only' ? 'blocks' : next === 'no-food' ? 'items' : 'food');}}/>
      <Combobox label="烧炼进度" value={String(progress)} options={[0, .25, .5, 1].map(value => ({value: String(value), label: `${value * 100}%`}))} onValueChange={value => setProgress(Number(value))}/>
      <Switch label="接受配方修改" checked={accept} onChange={event => setAccept(event.currentTarget.checked)}/>
      <Switch label="物品栏标签状态" checked={inventoryTab} onChange={event => setInventoryTab(event.currentTarget.checked)}/>
      <Switch label="禁用配方簿" checked={bookDisabled} onChange={event => setBookDisabled(event.currentTarget.checked)}/>
      <Switch label="锁定工具栏" checked={toolbarDisabled} onChange={event => setToolbarDisabled(event.currentTarget.checked)}/>
      <Switch label="独立过滤器只读" checked={filterReadOnly} onChange={event => setFilterReadOnly(event.currentTarget.checked)}/>
    </div>
    {!ready && <p>正在加载像素字体…</p>}
    {ready && (['furnace', 'blast', 'smoker'] as const).map(kind => {
      const Screen = kind === 'furnace' ? FurnaceScreen : kind === 'blast' ? BlastFurnaceScreen : SmokerScreen;
      return <section key={kind} aria-label={`${titles[kind]}完整界面`} style={{minWidth: 0}}>
        <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12}}><h3 style={{margin: 0}}>{titles[kind]}</h3><Button ref={node => {reopen.current[kind] = node;}} disabled={!closed[kind]} onClick={() => setClosed(old => ({...old, [kind]: false}))}>重新打开{titles[kind]}</Button></div>
        <div hidden={closed[kind]}><Viewport label={`${titles[kind]}固定画布`}><Screen data-testid={`furnace-demo-${kind}`} title={titles[kind]} layout={layouts[kind]} recipeBook={book} processing={processing(kind)} disabled={toolbarDisabled}
          recipeBookLayoutLabel="配方簿模式" compactLayoutLabel="紧凑模式" helpLabel="烧炼帮助" closeLabel="关闭烧炼界面"
          onLayoutChange={value => {setLayouts(old => ({...old, [kind]: value})); setStatus(`${titles[kind]}已切换为${value === 'compact' ? '紧凑' : '配方簿'}模式。`);}}
          onHelp={() => setStatus('帮助：选择配方、放入材料与燃料。此预览只展示宿主状态。')}
          onClose={() => {setClosed(old => ({...old, [kind]: true})); setLastClosed(kind); setStatus(`${titles[kind]}预览已关闭。`);}}/></Viewport></div>
      </section>;
    })}
    <p data-testid="furnace-screen-demo-status" role="status" style={{margin: 0, overflowWrap: 'anywhere'}}>{status}</p>
    <section aria-label="复用烧炼框架" style={{minWidth: 0}}><h3>可复用框架</h3><Viewport label="可复用紧凑框架画布"><FurnaceScreenFrame title="自定义框架" defaultLayout="compact" recipeBook={<FurnaceRecipeBook {...book}/>} onLayoutChange={value => setStatus(`复用框架已切换为 ${value}。`)} onClose={() => setStatus('已收到复用框架关闭请求。')}><Furnace title="自定义熔炉" {...processing('furnace')}/></FurnaceScreenFrame></Viewport></section>
    <section aria-label="独立烧炼配方组件" style={{minWidth: 0}}><h3>独立配方组件</h3>
      <Viewport label="独立配方簿画布" top={60}><FurnaceRecipeBook {...book} data-testid="furnace-demo-book"/></Viewport>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 16, paddingTop: 16}}>
        <FurnaceRecipeCategoryTabs bindings={bindings} labels={categoryLabels} value={category} onValueChange={book.onCategoryChange} label="独立烧炼分类"/>
        <FurnaceRecipeFilterToggle filteringEnabled={filtering} onFilteringEnabledChange={book.onFilteringEnabledChange} readOnly={filterReadOnly} label="独立烧炼过滤器"/>
        <FurnaceRecipeBookEntry entry={catalog[0]} selected onRecipeAction={book.onRecipeAction}/>
      </div>
    </section>
    <details><summary>关于这个示例</summary><p>三种完整界面与框架共用实际游戏物品和原始界面贴图。配方集合、分类可见绑定、可用标记及进度均由此示例的宿主显式提供，不推断游戏配方、燃料或时间。搜索与过滤只更新本地目录；所有槽位操作只记录请求。</p><p>工具栏和配方簿的禁用状态独立。只读开关只作用于独立过滤器。固定源画布保留 652 × 332 / 352 × 332 尺寸，小视口可在局部横向区域中查看，不缩放纹理。此预览未声明原生整页像素一致。</p></details>
  </div>;
}
