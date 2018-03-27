import BlockingQueue from './utils/blocking-queue';

/**
 * Global event queue. Accumulates external events ('add:<key>', 'remove:<key>' and 'change:<key>')
 * until the top-level object is fully initialized (see 'Backbone.Relational.Model').
 */
export default new BlockingQueue();
