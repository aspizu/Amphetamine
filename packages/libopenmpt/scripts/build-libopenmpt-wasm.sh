#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "${PACKAGE_DIR}/../.." && pwd)"
OPENMPT_DIR="${ROOT_DIR}/openmpt"
DIST_DIR="${PACKAGE_DIR}/dist"
IMAGE="${EMSCRIPTEN_DOCKER_IMAGE:-emscripten/emsdk:4.0.10}"
OPENMPT_COMMIT="4c3ba47c7977fe3016b474f8ed192e619ae85f7d"

EXPORTED_FUNCTIONS="['_malloc','_free','_openmpt_get_library_version','_openmpt_get_core_version','_openmpt_get_string','_openmpt_free_string','_openmpt_module_create_from_memory','_openmpt_module_destroy','_openmpt_module_read_float_stereo','_openmpt_module_get_duration_seconds','_openmpt_module_get_position_seconds','_openmpt_module_set_position_seconds','_openmpt_module_set_repeat_count','_openmpt_module_set_render_param','_openmpt_module_get_metadata_keys','_openmpt_module_get_metadata','_openmpt_module_get_current_row','_openmpt_module_get_current_pattern','_openmpt_module_get_current_order','_openmpt_module_get_num_orders','_openmpt_module_get_num_patterns','_openmpt_module_get_num_channels','_openmpt_module_ctl_set']"

if [[ ! -d "${OPENMPT_DIR}/.git" ]]; then
  echo "Missing libopenmpt checkout at ${OPENMPT_DIR}" >&2
  exit 1
fi

ACTUAL_OPENMPT_COMMIT="$(git -C "${OPENMPT_DIR}" rev-parse HEAD)"
if [[ "${ACTUAL_OPENMPT_COMMIT}" != "${OPENMPT_COMMIT}" ]]; then
  echo "Expected libopenmpt ${OPENMPT_COMMIT}, got ${ACTUAL_OPENMPT_COMMIT}" >&2
  exit 1
fi

mkdir -p "${DIST_DIR}"
rm -f "${OPENMPT_DIR}/bin/libopenmpt.js" "${OPENMPT_DIR}/bin/libopenmpt.wasm"

docker run --rm \
  -u "$(id -u):$(id -g)" \
  -v "${ROOT_DIR}:/src" \
  -w /src/openmpt \
  "${IMAGE}" \
  make CONFIG=emscripten EMSCRIPTEN_TARGET=wasm EXAMPLES=0 OPENMPT123=0 bin/libopenmpt.js \
    SO_LDFLAGS="-s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT='web,worker,node' -s EXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS} -s EXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPF32']"

cp "${OPENMPT_DIR}/bin/libopenmpt.js" "${DIST_DIR}/libopenmpt.js"
cp "${OPENMPT_DIR}/bin/libopenmpt.wasm" "${DIST_DIR}/libopenmpt.wasm"
