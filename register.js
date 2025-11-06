// For running unit tests on TypeScript,  hence has to be JavaScript

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("ts-node/esm", pathToFileURL("./"));
