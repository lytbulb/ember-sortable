import Ember from 'ember';
import computed from 'ember-new-computed';

const { A, Component, get, set, run } = Ember;

export default Ember.Service.extend({

	groups: computed(() => A()).readOnly(),

	register(group) {
		this.get('groups').push(group);
	},
	
	/**
	* Dragged item.
	* @type {SortableItem}
	*/
	item: null,
	
	/**
	* Index where the item is meant to be inserted.
	* @type {Number}
	*/
	insertAt: null,
	
	/**
	* Group from which the item is being dragged.
	* @type {SortableGroup}
	*/
	source: null,
	
	/**
	* Group in which the item has been dropped.
	* @type {SortableGroup}
	*/
	destination: null,
	
	handleCommit() {
		let item = this.get('item'),
			source = this.get('source'),
			destination = this.get('destination'),
			insertAt = this.get('insertAt');
			
		
		source.cleanup();
		destination.cleanup();
		
		source.sendAction('onRemove', item.get('model'), source.get('model'));
		destination.sendAction('onAdd', item.get('model'), destination.get('model'), insertAt);
	},
	
	handleDragStart(item, group) {
	
		this.setProperties({
			item: item,
			itemIndex: group.get('model').indexOf(item.get('model')),
			source: group,
			destination: group,
			insertAt: group.get('model').indexOf(item.get('model'))
		});
		
		this.subscribe(item);
	  	
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleDrop() {
		
		this.unsubscribe();
		
		if (!this.get('destination')) {
			this.set('item.group', this.get('source'));
			this.set('destination', this.get('source'));
			this.get('source').home(this.get('itemIndex'), this.get('item'));
		} else {
			this.get('destination').update();
		}
		
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseEnter(item, group) {
		
		if (this.get('destination')) {
			this.get('destination').update();
		} else {
			this.get('source').update();
		}
		
		this.setDestination(group);
		
		this.get('source').update();
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseLeave(item, group) {
	
		this.setDestination(null);
		
		let source = this.get('source');
		
		if (group !== source) {
			// update the group as the item is no longer there
			group.update();
		}
		
		// highlight it's original position in the source
		source.welcome(this.get('itemIndex'), item);
	},
	
	setDestination(group) {
		this.set('item.group', group);
		this.set('destination', group);
	},
	
	/**
	* @param {SortableItem} item
	*/
	subscribe(item) {
		this.get('groups').forEach(group => {
			group.setProperties({
				mouseEnter: this.handleGroupMouseEnter.bind(this, item, group),
				mouseLeave: this.handleGroupMouseLeave.bind(this, item, group)
			});
		});
	},
	
	unsubscribe() {
		this.get('groups').forEach(group => {
			group.setProperties({
				mouseEnter: null,
				mouseLeave: null
			});
		});
	},
	
	cancel() {
		this.get('item');
	}
	
	
	
	
	

});
