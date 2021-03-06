import Ember from 'ember';
import computed from 'ember-new-computed';


export default Ember.Service.extend({

	/**
	* @type {Array.<SortableGroup>} group
	*/
	groups: computed(() => Ember.A()).readOnly(),

	/**
	* @param {SortableGroup} group
	*/
	register(group) {
		this.get('groups').addObject(group);
	},

	/**
	* @param {SortableGroup} group
	*/
	unregister(group) {
		this.get('groups').removeObject(group);
	},

	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleDragStart(item, group) {
		this.subscribe(item, group);

		group.set('inviteDrop', true);

		item.setProperties({
			source: group,
			insertAt: group.indexOf(item),
			removeAt: group.indexOf(item)
		});
	},

	handleDrag(event, item) {
		var groups = this.get('groups');
		var group = this.get('group');
		var currentGroup = groups.find((group) => {
			return group.isIntersected(event.pageX, event.pageY);
		});

		if(group !== currentGroup){
			if(group) this.handleGroupMouseLeave(item, group);
			if(currentGroup) this.handleGroupMouseEnter(item, currentGroup);

			// highlight item's original position in the source
			if(!currentGroup) source.welcome(item.get('removeAt'), item);
		}

		this.set('group', currentGroup);
	},

	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseEnter(item, group) {
		if (group.isConnected(item.get('source'))) {
			group.set('inviteDrop', true);
			item.set('group', group);
			item.get('source').update();
		}
	},

	/**
	* @param {SortableItem} item
	* @param {SortableGroup} group
	*/
	handleGroupMouseLeave(item, group) {
		let source = item.get('source');

		item.set('group', null);

		group.set('inviteDrop', false);

		// update the group as the item is no longer in it
		if (group !== source) {
			group.update();
		}
	},

	/**
	* @param {SortableItem} item
	*/
	handleDrop(item) {

		this.unsubscribe();

		// if item is dropped outside any group
		if (!item.get('group')) {
			// we will set its group back to source
			item.set('group', item.get('source'));
			item.get('group').welcome(item.get('removeAt'), item);
		} else {
			item.get('group').update();
		}

	},

	/**
	* @param {SortableItem} item
	* @type {SortableGroup} group
	*/
	handleCommit(item, group) {
		let source = item.get('source'),
			removeAt = item.get('removeAt'),
			insertAt = item.get('insertAt');

		group.cleanup();
		source.cleanup();

		if (group === source && insertAt !== removeAt) {
			group.sendAction('onMove', item.get('model'), group.get('model'), insertAt, group.get('unique'));
		}
		else if (group !== source) {
			source.sendAction('onRemove', item.get('model'), source.get('model'), removeAt, source.get('unique'));
			group.sendAction('onAdd', item.get('model'), group.get('model'), insertAt, group.get('unique'));
		}

		group.sendAction('onAll', item.get('model'), source.get('model'), removeAt, group.get('model'), insertAt, group.get('unique'))
	},

	/**
	* @param {SortableItem} item
	*/
	subscribe(item, source) {
		this.set('group', source);

		this.get('groups').forEach(group => {
			group.setProperties({
				acceptsDrop: group.get('connect') === source.get('connect'),
				rejectsDrop: group.get('connect') !== source.get('connect'),
			});
		});
	},

	unsubscribe() {
		this.get('groups').forEach(group => {
			group.cleanupDragStyling();
			group.setProperties({
				acceptsDrop: null,
				rejectsDrop: null
			});
		});

		this.set('group', null);
	}

});
