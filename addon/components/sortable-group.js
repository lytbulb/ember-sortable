import Ember from 'ember';
import layout from '../templates/components/sortable-group';
import computed from 'ember-new-computed';
const { A, Component, get, set, run } = Ember;
const a = A;

export default Component.extend({

	classNameBindings: ['acceptsDrop', 'rejectsDrop', 'inviteDrop'],
	
	layout: layout,
	
	/**
	* @type {SortableManager}
	*/
	manager: Ember.inject.service('sortable-manager'),
	
	acceptsDrop: false,
	
	rejectsDrop: false,
	
	inviteDrop: false,
	
	
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
	position: computed({
		get() {
			if (!this._position) {
				this._position = {
		    		x: this.get('sortedItems.firstObject.x'),
		    		y: this.get('sortedItems.firstObject.y')
		    	};
			}
			return {
				x: this._position.x,
				y: this._position.y
			};
		},
		set(key, value) {
			this._position = value;
		}
    }).volatile(),
    
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
    * @param {SortableGroup} group
    */
    isConnected(group) {
    	return this.get('connect') === group.get('connect');
    },
    
    /**
    * @param {SortableItem} item
    */
    indexOf(item) {
    	return this.get('sortedItems').indexOf(item);
    },
    
    /**
    * @param {SortableItem} item
    */
    handleDragStart(item) {
    	this.update();
    	this.get('manager').handleDragStart(item, this);
    },
    
    /**
    * @param {SortableItem} item
    */
    handleDrag(item) {
		run.throttle(this, 'update', this.get('updateInterval'));
    },
    
    /**
    * @param {SortableItem} item
    */
    handleDrop(item) {
    	this.get('manager').handleDrop(item, this);
    },
    
    /**
  	* Update items position.
  	* @param {Array.<SortableItem>} items
  	*/
    update(items) {
    	let direction = this.get('direction');
    	let position = this.get('position');
    	let dimension = this.get('dimension');
    	
    	(items || this.get('sortedItems')).forEach((item, index) => {
    		
    		if (!get(item, 'isDragging')) {
    			item.setProperties(position);
    		} else {
    			item.set('insertAt', index);
    		}
    		
    		position[direction] += get(item, dimension);
    		
    	});
    },
    
    /**
  	* Make space for the item.
  	*/
    welcome(index, item) {
    	this.update(this.get('sortedItems').removeObject(item).insertAt(index, item));
    },
    
    /**
    * @method commit
    */
    commit(item) {
    	this.get('manager').handleCommit(item, this);
    },
    
    /**
    * @method cleanup
    */
    cleanup() {
    	let items = this.get('sortedItems');
    	
    	this.setProperties({
    		acceptsDrop: false,
    		rejectsDrop: false,
    		inviteDrop: false
    	});
    	
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
    }
    
});
