import Ember from 'ember';
import layout from '../templates/components/sortable-group';
import computed from 'ember-new-computed';
const { A, Component, get, set, run } = Ember;
const a = A;

export default Component.extend({
	
	layout: layout,
	
	/**
	* @type {SortableManager}
	*/
	manager: Ember.inject.service('sortable-manager'),
	
	/**
	* @type {String}
	*/
	direction: 'y',
	
	/**
    * Dimension based on direction.
    * @readonly
    * @type {String}
    */
  	dimension: computed('direction', function() {
  		return {
    		x: 'width',
    		y: 'height'
    	}[this.get('direction')];
  	}).readOnly(),
	
	/**
	* @readonly
	* @type {Array.<SortableItem>}
	*/
	items: computed(() => a()).readOnly(),
	
	/**
	* The frequency in milliseconds with which the group updates
	* the items' position.
	* @type {Number}
	*/
	updateInterval: 125,
  
	/**
	* Position for the first item.
	* @readonly
	* @type Number
	*/
	itemPosition: computed(function() {
    	let direction = this.get('direction');
    	let firstItem = this.get('sortedItems').findBy('isDragging', false);
    
    	this.set('positionX', get(firstItem, 'x'));
    	
    	return get(firstItem, direction);
    }).volatile().readOnly(),
    
    /**
    * @readonly
    * @type {Array.<SortedItem>}
    */
    sortedItems: computed(function() {
    	return a(this.get('items')).sortBy(this.get('direction'));
    }).volatile().readOnly(),
    
    register: Ember.on('didInsertElement', function() {
		this.get('manager').register(this);
	}),
    
    /**
    * @param {SortableItem} item
    */
    registerItem(item) {
    	this.get('items').addObject(item);
    },
    
    /**
    * @param {SortableItem} item
    */
    deregisterItem(item) {
    	this.get('items').removeObject(item);
    },
    
    /**
    * @param {SortableItem} item
    */
    handleDragStart(item) {
    	this.get('manager').handleDragStart(item, this);
    },
    
    /**
    * @param {SortableItem} item
    */
    handleDrop(item) {
    	this.get('manager').handleDrop(item, this);
    },
    
    /**
    * Prepare for sorting.
    * Main purpose is to stash the current itemPosition so
    * we don't incur expensive re-layouts.
    */
    prepare() {
    	if (!this._itemPosition) {
  			this._itemPosition = this.get('itemPosition');
  		}
  		return this._itemPosition;
  	},
  	
  	/**
  	* Update items position.
  	*/
  	update() {
		let position = this._itemPosition,
			direction = this.get('direction'),
			dimension = this.get('dimension');
    	
    	this.get('sortedItems').forEach((item, index) => {
    		if (!get(item, 'isDragging')) {
    			set(item, direction, position);
    		} else {
    			set(this.get('manager'), 'insertAt', index);
    		}
    		if (get(item, 'isDropping')) {
    			set(item, 'x', this.get('positionX'));
    		}
    		position += get(item, dimension);
    	});
    },
    
    _applyUdate() {
    	let position = this._itemPosition;
    	let direction = this.get('direction');
    	let dimension = this.get('dimension');
    	
    	this.get('sortedItems').forEach((item, index) => {
    		if (!get(item, 'isDragging')) {
    			set(item, direction, position);
    		} else {
    			set(this.get('manager'), 'insertAt', index);
    		}
    		if (get(item, 'isDropping')) {
    			set(item, 'x', this.get('positionX'));
    		}
    		position += get(item, dimension);
    	});
    },
    
    /**
  	* Make space for the item.
  	*/
    welcome(index, item) {
    	let position = this._itemPosition;
    	let direction = this.get('direction');
    	let dimension = this.get('dimension');
    	
    	a(this.get('sortedItems')).removeObject(item).insertAt(index, item).forEach((item, index) => {
    		if (!get(item, 'isDragging')) {
    			set(item, direction, position);
    		} else {
    			set(this.get('manager'), 'insertAt', index);
    		}
    		if (get(item, 'isDropping')) {
    			set(item, 'x', this.get('positionX'));
    		}
    		position += get(item, dimension);
    	});
    },
    
    /**
  	* Make space for the item.
  	*/
    home(index, item) {
    	let position = this._itemPosition;
    	let direction = this.get('direction');
    	let dimension = this.get('dimension');
    	
    	a(this.get('sortedItems')).removeObject(item).insertAt(index, item).forEach((item, index) => {
    		console.log(item.get('model'), position);
    		set(item, direction, position);
    		if (get(item, 'isDropping')) {
    			set(item, 'x', this.get('positionX'));
    		}
    		position += get(item, dimension);
    	});
    },
    
    /**
    * @method commit
    */
    commit() {
    	this.get('manager').handleCommit();
    },
    
    /**
    * @method cleanup
    */
    cleanup() {
    	let items = this.get('sortedItems');
    	
    	delete this._itemPosition;
    	
    	run.schedule('render', () => {
    		items.invoke('freeze');
    	});
    	
    	run.schedule('afterRender', () => {
    		items.invoke('reset');
    	});
    	
    	run.next(() => {
    		run.schedule('render', () => {
    			items.invoke('thaw');
    		});
    	});
    },
    
    
    
});
