import Backbone from 'backbone';
import { Collection as BBCollection, Model as BBModel } from 'backbone';
import _ from 'underscore';
import Semaphore from './utils/semaphore';
import BlockingQueue from './utils/blocking-queue';
import eventQueue from './event-queue';
import BObject from './utils/object';
import config from './config';
import Collection from './collection';
import relationTypeStore from './relation-type-store';
import Relation from './relation';
import HasOne from './relation.has-one';
import HasMany from './relation.has-many';
import Store from './utils/store';
import store from './store';
import Model from './model';

const module = config;

module.Collection = Collection;
module.Semaphore = Semaphore;
module.BlockingQueue = BlockingQueue;
module.eventQueue = eventQueue;
module.relationTypeStore = relationTypeStore;

module.Store = Store;
module.store = store;

module.Relation = Relation;
module.HasOne = HasOne;
module.HasMany = HasMany;

relationTypeStore.registerType( 'HasOne', module.HasOne );
relationTypeStore.registerType( 'HasMany', module.HasMany );

module.Model = Model;

export default module;
