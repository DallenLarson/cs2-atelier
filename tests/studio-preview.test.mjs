import test from "node:test";
import assert from "node:assert/strict";
import { REGISTRY } from "../public/studio-core.js";
import { viewmodelPose, crosshairGeometry } from "../public/studio-preview.js";
const values = (overrides) => (key) =>
  overrides[key] ?? REGISTRY.find((r) => r.command === key).preview;
test("projection shrinks with wider FOV and greater depth; handedness mirrors around center", () => {
  const base = viewmodelPose(values({}));
  assert.ok(viewmodelPose(values({ viewmodel_fov: 68 })).scale < base.scale);
  assert.ok(
    viewmodelPose(values({ viewmodel_offset_y: 2 })).scale < base.scale,
  );
  const left = viewmodelPose(values({ cl_prefer_lefthanded: 1 }));
  assert.equal(left.left + base.left, 100);
  assert.equal(left.scale, base.scale);
  assert.ok(
    viewmodelPose(values({ viewmodel_offset_z: 2 })).bottom > base.bottom,
  );
});
test("crosshair respects reference resolution, negative gaps and large sizes", () => {
  const full = crosshairGeometry(
    1080,
    values({ cl_crosshair_gap: -8, cl_crosshair_length: 255 }),
  );
  const half = crosshairGeometry(
    540,
    values({ cl_crosshair_gap: -8, cl_crosshair_length: 255 }),
  );
  assert.equal(full.gap, -8);
  assert.equal(full.length, 255);
  assert.equal(half.length, full.length / 2);
  assert.equal(half.thickness, full.thickness / 2);
  assert.equal(
    crosshairGeometry(1080, values({ cl_crosshair_screen_height: 2160 }))
      .length,
    4,
  );
});
