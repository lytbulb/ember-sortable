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

				let first = this.get('sortedItems').findBy('isDragging', false);

				if (first) {
					this._position = {
			    		x: first.get('x'),
			    		y: first.get('y')
			    	};
				} else {
					// the group is empty
					let item = this.get('sortedItems').findBy('isDragging', true);
					this._position = {
						x: this.element.scrollLeft + this.element.offsetLeft - parseFloat(this.$().css('padding-top')) + parseFloat(item.$().css('margin-top')),
						y: this.element.scrollTop + this.element.offsetTop + parseFloat(this.$().css('padding-left')) + parseFloat(item.$().css('margin-left'))
					}
				}
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

    width: computed({
    	get() {
			if (this._width === undefined) {
				this._width = 0;
			}
			return this._width;
		},
		set(key, value) {
			if (value !== this._width) {
				this._width = value;
				this._scheduleApplyPosition();
			}
		}
    }).volatile(),

    height: computed({
    	get() {
			if (this._height === undefined) {
				this._height = 0;
			}
			return this._height;
		},
		set(key, value) {
			if (value !== this._height) {
				this._height = value;
				this._scheduleApplyPosition();
			}
		}
    }).volatile(),

    size: computed('width', 'height', function() {
		return {
			width: this.get('width'),
			height: this.get('height')
		}
    }).readOnly(),

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

	unregister: Ember.on('willDestroyElement', function() {
		this.get('manager').unregister(this);
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
    	let direction = this.get('direction'),
    		position = this.get('position'),
    		dimension = this.get('dimension'),
    		size = 0;

    	(items || this.get('sortedItems')).forEach((item, index) => {

    		if (!get(item, 'isDragging')) {
    			item.setProperties(position);
    		} else {
    			item.set('insertAt', index);
    		}

    		position[direction] += item.get(dimension);
    		size += item.get(dimension);

    	});

    	this.set(dimension, size);
    },

    _scheduleApplyPosition() {
    	run.scheduleOnce('render', this, '_applyPosition');
    },

    _applyPosition() {
    	if (!this.element) { return; }
    	this.$().css(this.get('dimension'), this.get('size')[this.get('dimension')]);
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

    	delete this._position;

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
