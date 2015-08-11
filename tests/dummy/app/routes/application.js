import Ember from 'ember';
const a = Ember.A;

export default Ember.Route.extend({
  
  model() {
    return {
      one: a(['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco']),
      two: a(['One', 'Two', 'Three', 'Four', 'Five']),
      three: a(['Eins', 'Zwei', 'Drei', 'Vier', 'Funf'])
    };
  },

  actions: {
    
    add(item, source, index, unique) {
    	console.log('add item to:', unique);
    	source.insertAt(index, item);
    },
    
    remove(item, source, index, unique) {
    	console.log('remove item from:', unique);
    	source.removeObject(item);
    },
    
    move(item, source, index, unique) {
    	console.log('move item within:', unique);
    	source.removeObject(item).insertAt(index, item);
    }
    
  }
});
