/**
* Reset variables that are persistent across tests, specifically `window.requests` and the state of
* `Backbone.Relational.store`.
*/
export const reset = function reset() {
	// Reset last ajax requests
	window.requests = [];

	Backbone.Relational.store.reset();
	Backbone.Relational.store.addModelScope( window );
	Backbone.Relational.eventQueue = new Backbone.Relational.BlockingQueue();
};
