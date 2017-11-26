# Upgrade Guides

## `0.9.0` to `0.10.0`

### Importing

Previously Backbone Relational would directly modify the Backbone namespace. This is no longer the case; we now export to our own namespace which can be required or imported. Another big change is that we no directly monkey patch Backbone's Collection class. Instead we subclass it and use our own.

#### Old

```javascript
// Browser (omitted is the <script> includes)
const RelationalModel = Backbone.RelationalModel;
const RelationalCollection = Backbone.Collection;
const HasManyRelation = Backbone.HasMany;
const HasOneRelation = Backbone.HasOne;
const store = Backbone.Relational.store;

// ES6
import Backbone from 'backbone';
import 'backbone-relational';

const RelationalModel = Backbone.RelationalModel;
const RelationalCollection = Backbone.Collection;
const HasManyRelation = Backbone.HasMany;
const HasOneRelation = Backbone.HasOne;
const store = Backbone.Relational.store;

// Node
const Backbone = require('backbone');
require('backbone-relational');

const RelationalModel = Backbone.RelationalModel;
const RelationalCollection = Backbone.Collection;
const HasManyRelation = Backbone.HasMany;
const HasOneRelation = Backbone.HasOne;
const store = Backbone.Relational.store;
```

#### New

```javascript
// Browser (omitted is the <script> includes)
const RelationalModel = BackboneRelational.Model;
const RelationalCollection = BackboneRelational.Collection;
const HasManyRelation = BackboneRelational.HasMany;
const HasOneRelation = BackboneRelational.HasOne;
const store = BackboneRelational.store;

// ES6
import * as BackboneRelational from 'backbone-relational';

const RelationalModel = BackboneRelational.Model;
const RelationalCollection = BackboneRelational.Collection;
const HasManyRelation = BackboneRelational.HasMany;
const HasOneRelation = BackboneRelational.HasOne;
const store = BackboneRelational.store;

// Node
const BackboneRelational = require('backbone-relational');

const RelationalModel = BackboneRelational.Model;
const RelationalCollection = BackboneRelational.Collection;
const HasManyRelation = BackboneRelational.HasMany;
const HasOneRelation = BackboneRelational.HasOne;
const store = BackboneRelational.store;
```
