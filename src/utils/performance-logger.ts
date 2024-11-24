import{ performanceLoggerActive }from"../types/constants";

const map: {[name: string]: number[]} = {}

export function logPerformance( name: string, clear:boolean = false ):void{
  if( !performanceLoggerActive ){
    return;
  }
  const ts = performance.now();
  let entries = map[name];
  if( clear || !entries ){
    map[name] = [ts]
    entries = map[name];
  }else{
    entries.push( ts )
  }
  if( entries.length > 1 ){
    const t = entries[entries.length-1] - entries[0];
    console.log( `${name} execution time: ${ t.toFixed( 2 ) }ms - step ${entries.length}` );
  }else{
    console.log( `${name} STARTED` );
  }

}