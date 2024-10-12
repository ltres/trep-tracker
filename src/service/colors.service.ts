import{ Injectable }from'@angular/core';

@Injectable( {
  providedIn: 'root',
} )
export class ColorsService{

  private _colors:{[colorName: string]: string} = {}

  constructor(){
    const keys: string[] = Array.from( document.styleSheets )
      .filter( sheet =>  sheet.href === null || sheet.href.startsWith( window.location.origin ) )
      .reduce(
        // @ts-expect-error types
        ( acc, sheet ) => ( acc = [...acc, ...Array.from( sheet.cssRules ).reduce( ( def, rule ) =>  ( def = rule.selectorText === ":root" ? [...def, ...Array.from( rule.style ).filter( name => name.startsWith( "--" ) ) ]: def ), [] as string[] ) ] ), [] as string[]
      );
    const varz = getComputedStyle( document.documentElement );

    for( let i = 0 ; i < keys.length; i++ ){ 
      const ruleKey = keys[i];
      if( ruleKey.startsWith( '--' ) ){
        this._colors[ruleKey] = varz.getPropertyValue( ruleKey )
      }
    }
  }

  get colors(){
    return this._colors
  }

  findColor( color: string ): string{
    return this._colors[`--${color}`]
  }

}
