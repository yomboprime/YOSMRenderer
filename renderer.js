
const path = require( 'path' );
var fs = require( 'fs' );
var mkdirp = require( 'mkdirp' );
var mapnik = require( 'mapnik' );


/***********
 * 
 * User parameters... TODO get them from console parameters.
 * 
 * */

// Set here the min and max zoom levels (absolute min is 0, absolute max is 22)
var minZoom = 0;
var maxZoom = 6;

// Set here the coordinates to be represented:

// (Island of Mallorca):

var minLon = 2.2796592;
var maxLon = 3.506008;
var minLat = 39.2536645;
var maxLat = 39.9793632;

// File that describes the map
var mapnikXMLPath = "../mapnik.xml";

/************/


// Constants

var MAP_SIZE = 256;
var MIN_GLOBAL_LON = -180;
var MAX_GLOBAL_LON = 180;
var DELTA_GLOBAL_LON = MAX_GLOBAL_LON - MIN_GLOBAL_LON;

console.log( "Tile Renderer starting..." );

var time0 = new Date();

mapnik.register_fonts( '/usr/share/fonts', { recurse: true } );
mapnik.register_default_input_plugins();

var map = new mapnik.Map( MAP_SIZE, MAP_SIZE );
var image = new mapnik.Image( MAP_SIZE, MAP_SIZE );

console.log( "Loading map..." );

map.loadSync( path.resolve(__dirname, mapnikXMLPath ) );

console.log( "Map loaded. Scanning through tiles..." );

var z = minZoom;
var x0 = longitudeToTileX( minLon, z );
var y0 = latitudeToTileY( maxLat, z );

var x1 = longitudeToTileX( maxLon, z );
var y1 = latitudeToTileY( minLat, z );// TODO + 1;

var x = x0;
var y = y0;

var tilesCount = 0;

var generateTiles = function() {
    
    return function() {

        // Render the next tile
        generateTile( z, x, y, function( didGenerate ) {

            if ( didGenerate ) {
                tilesCount++;
            }

            // Increment counters to next tile while checking
            y++;
            if ( y > y1 ) {
                y = y0;
                x++;
                if ( x > x1 ) {
                    x = x0;
                    z++;
                    if ( z > maxZoom ) {
                        console.log( tilesCount + " tiles were generated.");
                        console.log( "Elapsed time: " + convertTimeInSecondsToString( ( new Date() - time0 ) / 1000 ) );
                        console.log( "End." );
                        return;
                    }
                    else {
                        x0 = longitudeToTileX( minLon, z );
                        y0 = latitudeToTileY( maxLat, z );

                        x1 = longitudeToTileX( maxLon, z );
                        y1 = latitudeToTileY( minLat, z );// TODO + 1;

                        x = x0;
                        y = y0;
                    }
                }
            }
            
            // Perform next iteration
            generateTiles();
            
        } );

    };
}();

generateTiles();

function generateTile( z, x, y, callback ) {
    
    var imagePath = __dirname + "/../tiles/" + z + "/" + x + "/";
    var imageFileName = y + ".png";
    var imageFullPath = imagePath + imageFileName;

    if ( fs.existsSync( imagePath ) ) {
        if ( ! fs.existsSync( imageFullPath ) ) {
            generateTileInternal();
        }
        else  {
            console.log( "Skipping already existing tile: " + z + ", " + x + ", " + y );
            callback( false );
        }
    }
    else {
        mkdirp( imagePath, function ( err ) {

            if ( err ) {
                console.error( "Error while creating directory: " + imagePath + ", error: " + err );
                return;
            }
            
            generateTileInternal();
            
        } );
    }
    
    function generateTileInternal() {

        console.log( "Generating tile: " + z + ", " + x + ", " + y );
        
        var vtile = new mapnik.VectorTile( z, x, y );

        //console.log( "Rendering tile..." );
        map.render( vtile, {}, function( err, vtile ) {

                if ( err ) {
                    console.log( "Error while rendering tile: " + z + ", " + x + ", " + y );
                    return;
                }

                //console.log( "Tile rendered." );
                //console.log( "Rasterizing tile..." );

                vtile.render( map, image, {}, function( err, img ) {
                    
                        if ( err ) {
                            console.log( "Error while rasterizing tile: " + z + ", " + x + ", " + y );
                            return;
                        }

                        //console.log( "Tile rasterized." );
                        //console.log( "Saving tile image..." );

                        img.saveSync( imageFullPath, "png32" );

                        //console.log( "Image saved." );
                        
                        callback( true );

                } );

        });

    }

}

function longitudeToTileX( longitude, zoomLevel ) {
    
    return Math.floor( ( Math.pow( 2, zoomLevel ) ) * ( longitude - MIN_GLOBAL_LON ) / DELTA_GLOBAL_LON );
    
}

function latitudeToTileY( latitude, zoomLevel ) {

    return Math.floor( ( Math.pow( 2, zoomLevel ) ) * ( 1 - Math.log( Math.tan( latitude * Math.PI / 180 ) + 1 / Math.cos( latitude * Math.PI / 180 ) ) / Math.PI ) / 2 );

}












function tileXToLongitude( x, zoomLevel ) {
    
    // x can be fractional
    
    return x * DELTA_GLOBAL_LON / Math.round( Math.pow( 2, zoomLevel )  ) + MIN_GLOBAL_LON;

}

function tileYToLatitude( y, zoomLevel ) {
    
    // y can be fractional

    var n = Math.PI - 2 * Math.PI * y / Math.pow( 2, zoomLevel );
    
    return ( 180 / Math.PI * Math.atan ( 0.5 * ( Math.exp( n ) - Math.exp( -n ) ) ) );    
    
}

function convertTimeInSecondsToString( s ) {
    
    var str = "";
    var alreadyPrinted = false;
    
    if ( s > 3600 ) {
        var h = Math.floor( s / 3600 );
        str += h + " hours";
        s -= h * 3600;
        alreadyPrinted = true;
    }

    if ( s > 60 || alreadyPrinted ) {
        var m = Math.floor( s / 60 );
        str += ( alreadyPrinted ? ", " : "" ) + m + " minutes";
        s -= m * 60;
        alreadyPrinted = true;
    }
    
    str += ( alreadyPrinted ? ", " : "" ) + Math.floor( s ) + " seconds";
    s -= Math.floor( s );

    str += " and " + Math.round( s * 1000 ) + " milliseconds";

    return str;

}
