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
