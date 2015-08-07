import Ember from 'ember';
const a = Ember.A;

export default Ember.Route.extend({
  
  model() {
    return {
      one: a(['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco']),
      two: a(['One', 'Two', 'Three', 'Four', 'Five'])
    };
  },

  actions: {
    
    add(item, destination, index) {
    	destination.insertAt(index, item);
    },
    
    remove(item, source, index) {
    	source.removeObject(item);
    },
    
    sort(item, destination, index) {
    	//destination.removeObject(item).insertAt(index, item);
    }
    
  }
});
