import {version, homepage} from '../package.json';

const now = new Date();
const year = now.getFullYear();

export default `/**!
 * Backbone Relational v${version} (backbone-relational.js)
 * ----------------------------------
 * (c) 2011-${year} Paul Uithol and contributors (https://github.com/PaulUithol/Backbone-relational/graphs/contributors)
 * Distributed under MIT license
 *
 * ${homepage}
 */\n\n`;
