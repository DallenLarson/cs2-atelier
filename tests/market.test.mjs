import test from 'node:test';
import assert from 'node:assert/strict';
import { filterItems } from '../public/market-core.js';
const item = (name, price, quantity = 2) => ({market_hash_name:name, min_price:price, quantity, item_page:'https://skinport.com/market'});
const items = [
 item('★ Bowie Knife | Gamma Doppler (Factory New)', 200),
 item('★ StatTrak™ Bowie Knife | Gamma Doppler (Minimal Wear)', 150),
 item('★ Bowie Knife | Gamma Doppler (Battle-Scarred)', null),
 item('Souvenir AK-47 | Test (Factory New)', 30),
 item('AK-47 | Test (Factory New)', 20),
 item('AK-47 | Test (Minimal Wear)', 5, 0),
 item('Sport Gloves | Test (Field-Tested)', 50),
];
const run = q => filterItems(items, new URLSearchParams(q));
test('combines wear and starred StatTrak names, retains exact cheapest variant and isolates souvenirs', () => {
 const r = run('group=true&sort=low');
 assert.equal(r.total, 4);
 const bowie = r.items.find(i=>i.market_hash_name.includes('Bowie'));
 assert.equal(bowie.min_price,150);
 assert.equal(bowie.variantCount,3);
 assert.match(bowie.market_hash_name,/StatTrak/);
 assert.equal(r.items.find(i=>i.market_hash_name.startsWith('AK')).min_price,20);
});
test('applies intersecting filters before grouping, price bounds and availability', () => {
 assert.equal(run('group=true&category=knives&tracking=normal&max=180').total,0);
 assert.equal(run('group=true&category=knives&weapon=bowie&min=100&max=180&available=true').items[0].min_price,150);
 assert.equal(run('wear=Factory+New&tracking=souvenir&category=rifles').total,1);
 assert.equal(run('category=gloves').total,1);
});
test('wishlist stays exact and source data is not mutated', () => {
 const before = JSON.stringify(items);
 const r = filterItems(items,new URLSearchParams('category=wishlist&group=true'),items.slice(0,2).map(i=>({name:i.market_hash_name})));
 assert.equal(r.total,2);
 assert.equal(JSON.stringify(items),before);
});

test('categories can be combined without confusing stickers and agents or case keys and containers', async () => {
 const {itemType} = await import('../public/market-core.js');
 const samples = [
 ['★ Sport Gloves | Vice (Field-Tested)', 'gloves'],
 ['Special Agent Ava | FBI', 'agents'],
 ['Sir Bloody Miami Darryl | The Professionals', 'agents'],
 ['Sticker | FBI (Holo)', 'stickers'],
 ['Patch | Phoenix', 'patches'],
 ['Prisma Case Key', 'keys'],
 ['Prisma Case', 'containers'],
 ['Sealed Graffiti | Test (Brick Red)', 'graffiti'],
 ['StatTrak™ Music Kit | Test', 'music'],
 ['Souvenir Charm | Test', 'charms'],
 ['G3SG1 | Test (Factory New)', 'rifles'],
 ];
 for (const [name, expected] of samples) assert.equal(itemType(name), expected, name);
 const catalog = samples.map(([name]) => item(name,10));
 const result = filterItems(catalog,new URLSearchParams('category=gloves,agents&group=true'));
 assert.equal(result.total,3);
 assert.equal(result.categories.agents,2);
 assert.equal(result.categories.stickers,1);
});
test('search accepts unordered words and grouping retains comparable variants and total listings', () => {
 const result = run('q=doppler+bowie&group=true');
 assert.equal(result.total,1);
 assert.equal(result.items[0].variants.length,3);
 assert.equal(result.items[0].groupQuantity,6);
 assert.equal(result.items[0].familyName,'★ Bowie Knife | Gamma Doppler');
 assert.equal(result.items[0].variants[0].min_price,150);
});
