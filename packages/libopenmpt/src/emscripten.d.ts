import type {LibopenmptModuleOptions, LibopenmptRuntime} from "./runtime.js"

export default function createLibopenmpt(
  options?: LibopenmptModuleOptions,
): Promise<LibopenmptRuntime>
