import os from 'node:os';import path from 'node:path';import fs from 'node:fs';
import {chromium} from 'playwright';
export const browserPath=process.env.CHROMIUM_PATH||chromium.executablePath();
export const scratch=process.env.TMPDIR||os.tmpdir();
export const fontSource=process.env.FONT_SOURCE_DIR||'/data/font-deck-extension/extension';
export function chromeOptions(extension){return {headless:true,...(process.env.CHROMIUM_PATH?{executablePath:browserPath}:{}),args:['--no-sandbox',...(extension?[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]:[])]};}
export function profile(prefix){return fs.mkdtempSync(path.join(scratch,prefix));}
