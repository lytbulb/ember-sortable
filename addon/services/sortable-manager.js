import Ember from 'ember';
import computed from 'ember-new-computed';

export default Ember.Service.extend({

	groups: computed(() => Ember.A()).readOnly(),

	register(group) {
		this.get('groups').push(group);
	},
	
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
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleCommit(item, group) {
		let source = this.get('source'),
			itemIndex = this.get('itemIndex'),
			insertAt = this.get('insertAt');
			
		if (group === source && insertAt !== itemIndex) {
			group.sendAction('onSort', item.get('model'), group.get('model'), insertAt);
		} else {
			source.cleanup();
			source.sendAction('onRemove', item.get('model'), source.get('model'), itemIndex);
			
			group.cleanup();
			group.sendAction('onAdd', item.get('model'), group.get('model'), insertAt);
		}
	},
	
	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleDragStart(item, group) {
	
		this.setProperties({
			itemIndex: group.get('model').indexOf(item.get('model')),
			source: group,
			insertAt: group.get('model').indexOf(item.get('model'))
		});
		
		this.subscribe(item);
	  	
	},
	
	/**
	* @param {SortableItem} item
	*/
	handleDrop(item) {
		
		this.unsubscribe();
		
		if (!item.get('group')) {
			item.set('group', this.get('source'));
			item.get('group').home(this.get('itemIndex'), item);
		} else {
			item.get('group').update();
		}
		
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseEnter(item, group) {
		item.set('group', group);
		this.get('source').update();
	},
	
	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseLeave(item, group) {
		let source = this.get('source');
	
		item.set('group', null);
		
		// update the group as the item is no longer there
		if (group !== source) {
			group.update();
		}
		
		// highlight it's original position in the source
		source.welcome(this.get('itemIndex'), item);
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
	}

});
