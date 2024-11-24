// timing.decorator.ts
export function TimingDecorator(){
  return function(
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ){
    // Store the original method
    const originalMethod = descriptor.value;

    // Replace the method with our timed version
    descriptor.value = async function( ...args: unknown[] ){
      const start = performance.now();
            
      // Call the original method
      const result = await originalMethod.apply( this, args );
            
      const end = performance.now();
      const timeElapsed = end - start;
            
      console.log( `Method ${propertyKey} execution time: ${timeElapsed.toFixed( 2 )}ms` );
            
      return result;
    };

    return descriptor;
  };
}