// Projection of a fixed 2D reference, not a reconstruction of CS2 geometry.
export function viewmodelPose(value) {
  const focal =
    Math.tan((60 * Math.PI) / 360) /
    Math.tan((value("viewmodel_fov") * Math.PI) / 360);
  const depth = 18 / (18 + value("viewmodel_offset_y") - 1);
  const direction = value("cl_prefer_lefthanded") === 1 ? -1 : 1;
  return {
    left:
      50 +
      direction * (21 + (value("viewmodel_offset_x") - 1) * 3) * focal * depth,
    bottom: -12 + (value("viewmodel_offset_z") + 1) * 3 * focal * depth,
    scale: focal * depth,
  };
}

export function crosshairGeometry(height, value) {
  const scale = height / value("cl_crosshair_screen_height");
  return {
    scale,
    length: value("cl_crosshair_length") * scale,
    gap: value("cl_crosshair_gap") * scale,
    thickness: Math.max(1, value("cl_crosshair_thickness")) * scale,
  };
}
