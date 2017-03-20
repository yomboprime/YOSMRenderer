
Description
===========

This is a tool to render [Open Street Map](http://osm.org) map data to .png image files.

Requirements
============

- Node must be installed.
- gcc version 5.0.0 or higher.


Installation
===========

- Install required fonts:

        sudo apt install -y fonts-noto-cjk fonts-noto-hinted fonts-noto-unhinted ttf-unifont

- Install postgresql database engine and geospatial addon (can be other versions):

        sudo apt install postgresql-9.5 postgresql-9.5-postgis-2.2

- Install the program that converts OSM map data to postgresql database:

        sudo apt install osm2pgsql

- Create the 'gis' data base where all data will be stored (set your_user_name):

        sudo runuser -l postgres -c 'createuser your_user_name'
        sudo runuser -l postgres -c 'createdb gis -O your_user_name'
        sudo runuser -l postgres -c 'psql gis'

        In this last command you enter a postgres command line. Enter this 2 lines:
        
	CREATE EXTENSION postgis;
	CREATE EXTENSION hstore;
        
	And then exit by pressing ctrl-c

- Install mapnik-tools or mapnik-utils, wathever is in your system.
This is for indexing the coastlines shapes (shapeindex util):

        sudo apt install mapnik-tools

 or

        sudo apt install mapnik-utils

---------------

- Create a directory where all project data is to be stored (name it as you want):

        mkdir myMaps
        cd myMaps

- Copy / clone this repository and install its dependencies:

        git clone http://github.com/yomboprime/YOSMRenderer
        cd YOSMRenderer
        npm install


(This is the point you want to start from when re-creating the database from new map data.)

- Download the binary map data for your contry or your region of interest.
Mine is Spain. You can find yours in [geofabrik](http://download.geofabrik.de)

cd ..

        wget http://download.geofabrik.de/europe/spain-latest.osm.pbf.md5
        wget http://download.geofabrik.de/europe/spain-latest.osm.pbf

- Download the stylesheet that transforms the map data in graphical data.

I've used the default OSM style sheet. You can find more at [the mapnik wiki](https://github.com/mapnik/mapnik/wiki/StyleShare)

        git clone https://github.com/gravitystorm/openstreetmap-carto.git

- Download and process coastline shapes. This depends on the stylesheet you are using:

        cd openstreetmap-carto
        python scripts/get-shapefiles.py

- Fill in the data base with the map data stored in the binary .osm.pbf file you downloaded earlier.

This step is long. In my case it took 20 minutes approximately.

You may need to upper the limit in megabytes set in the --cache option, to avoid memory limit problems. I set it to 1500 MB to process Spain.

Set the name of the .style and .osm.pbf files accordingly to your style and data.

        cd ..

        osm2pgsql --create --slim \
            --cache 1500 --number-processes 2 --hstore \
            --style ./openstreetmap-carto/openstreetmap-carto.style --multi-geometry \
            ./spain-latest.osm.pbf`

- Finally, generate the mapnik.xml file. Set the style file (.mml in this case) accordingly:

        renderer/node_modules/carto/bin/carto openstreetmap-carto/project.mml > mapnik.xml


Usage
=====

- Now with the mapnik.xml file in your directory, you can call the renderer.

High zoom levels may take a long time, especially above 15.

These coordinate parameters are for the island of Mallorca. Set them for your region.

The tiles generated cover the specified rectangle.

        node YOSMRenderer/renderer.js --minLon 2.2796592 --maxLon 3.506008 --minLat 39.2536645 --maxLat 39.9793632 --minZoom 0 --maxZoom 15

Parameters:

        --minLon -180 .. 180 The longitude of the left border of the rectangle of interest.
        --maxLon -180 .. 180 The longitude of the right border of the rectangle of interest.
        --minLat -90 .. 90 The latitude of the south border of the rectangle of interest.
        --maxLat -90 .. 90 The latitude of the north border of the rectangle of interest.
        --minZoom 0 .. 22 The minimum Zoom level to process. Usually left this to 0
        --maxZoom 0 .. 22 The maximum zoom level to process.
        --mapFile <xml_file_name> The location of the XML file. Default: "../mapnik.xml"

Here are some times it took me for processing some zoom levels for the entire island of Mallorca:

 - Levels 0-15: 30 minutes. Size of the tiles: 130 MB
 - Levels 0-16: 3 hours. Size of the tiles: 360 MB
 - Levels 0-17: 12 hours. Size of the tiles: 950 MB

The tiles are saved automatically under the /tiles directory in your maps directory.

The renderer checks for existing images, so you can generate incrementally or continue an aborted process.

Just check for the latest images and delete the ones that aren't correct.

Usually you would make the tiles with these zoom steps:

        --minZoom 0 --maxZoom 15

        --minZoom 16 --maxZoom 16

        --minZoom 17 --maxZoom 17

        --minZoom 18 --maxZoom 18

... and so on. The limit is 22.
