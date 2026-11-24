// Turns user-supplied names into safe display names (no path or markup characters).
export const cleanName = (value, fallback) =>
  String(value || fallback).replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N} _.\-()]/gu, '').trim().slice(0, 120) || fallback;
