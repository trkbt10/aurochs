/**
 * @file VBA Serializer public exports
 */

export { compressVba, computeCopyTokenBitCount } from "./compression";
export {
  encodeMbcs,
  isSupportedCodePage,
  getSupportedCodePages,
  MbcsEncodingError,
} from "./mbcs-encoder";
export {
  serializeProjectStream,
  type ProjectModuleEntry,
} from "./project-stream";
export {
  serializeDirStream,
  createDirStreamInfo,
  type SerializeModuleEntry,
} from "./dir-stream";
export {
  serializeModuleStream,
  serializeModuleStreams,
  vbaModuleToInput,
  type SerializeModuleInput,
  type SerializedModule,
} from "./module-stream";
export {
  serializeVbaProject,
  type SerializeVbaProjectOptions,
} from "./vba-project";
