'use strict';

const libQ = require('kew');
const jellyfin = require(jellyfinPluginLibRoot + '/jellyfin')
const ExplodableViewHandler = require(__dirname + '/explodable');

class CollectionViewHandler extends ExplodableViewHandler {

    browse() {
        let defer = libQ.defer();
        let baseUri = this.getUri();
        let prevUri = this.constructPrevUri();
        let collectionId = this.getCurrentView().parentId;
        
        let listPromises = [
            this._getTopLevelItems(collectionId, baseUri)
        ];

        if (jellyfin.getConfigValue('showLatestMusicSection', true)) {
            listPromises.push(this._getLatestMusic(collectionId, baseUri));
        }
        if (jellyfin.getConfigValue('showRecentlyPlayedSection', true)) {
            listPromises.push(this._getRecentlyPlayed(collectionId, baseUri));
        }
        if (jellyfin.getConfigValue('showFrequentlyPlayedSection', true)) {
            listPromises.push(this._getFrequentlyPlayed(collectionId, baseUri));
        }
        if (jellyfin.getConfigValue('showFavoriteArtistsSection', true)) {
            listPromises.push(this._getFavoriteArtists(collectionId, baseUri));
        }
        if (jellyfin.getConfigValue('showFavoriteAlbumsSection', true)) {
            listPromises.push(this._getFavoriteAlbums(collectionId, baseUri));
        }
        if (jellyfin.getConfigValue('showFavoriteSongsSection', true)) {
            listPromises.push(this._getFavoriteSongs(collectionId, baseUri));
        }

        libQ.all(listPromises).then( (lists) => {
            let finalLists = [];
            lists.forEach( (list) => {
                if (list.items.length) {
                    finalLists.push(list);
                }
            });
            defer.resolve({
                navigation: {
                    prev: {
                        uri: prevUri
                    },
                    lists: finalLists
                }
            });
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    _getTopLevelItems(collectionId, baseUri) {
        let defer = libQ.defer();
        let userViewModel = this.getModel('userView');
        let baseImgPath = 'music_service/jellyfin/assets/images/';

        userViewModel.getUserView(collectionId).then( (userView) => {
            return userView.Name;
        }).then( (userViewTitle) => {
            let items = [
                {
                    service: 'jellyfin',
                    type: 'folder',
                    title: jellyfin.getI18n('JELLYFIN_ALBUMS'),
                    uri: baseUri + '/albums@parentId=' + collectionId,
                    albumart: '/albumart?sourceicon=' + baseImgPath + 'album.png'
                },
                {
                    service: 'jellyfin',
                    type: 'streaming-category',
                    title: jellyfin.getI18n('JELLYFIN_ALBUM_ARTISTS'),
                    uri: baseUri + '/albumArtists@parentId=' + collectionId,
                    albumart: '/albumart?sourceicon=' + baseImgPath + 'avatar.png'
                },
                {
                    service: 'jellyfin',
                    type: 'streaming-category',
                    title: jellyfin.getI18n('JELLYFIN_ARTISTS'),
                    uri: baseUri + '/artists@parentId=' + collectionId,
                    albumart: '/albumart?sourceicon=' + baseImgPath + 'avatar.png'
                },
                /*{
                    service: 'jellyfin',
                    type: 'streaming-category',
                    title: 'Playlists',
                    uri: baseUri + '/playlists@parentId=' + collectionId,
                    albumart: '/albumart?sourceicon=music_service/mpd/playlisticon.png'
                },*/
                {
                    service: 'jellyfin',
                    type: 'streaming-category',
                    title: jellyfin.getI18n('JELLYFIN_GENRES'),
                    uri: baseUri + '/genres@parentId=' + collectionId,
                    albumart: '/albumart?sourceicon=' + baseImgPath + 'genre.png'
                },
                {
                    service: 'jellyfin',
                    type: 'folder',
                    title: jellyfin.getI18n('JELLYFIN_ALL_SONGS'),
                    uri: baseUri + '/songs@parentId=' + collectionId,
                    albumart: '/albumart?sourceicon=' + baseImgPath + 'song.png'
                }
            ];

            defer.resolve({
                title: userViewTitle,
                availableListViews: ['list', 'grid'],
                items: items
            });
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }

    _getLatestMusic(collectionId, baseUri) {
		let options = {
			parentId: collectionId,
			sortBy: 'DateCreated,SortName',
			sortOrder: 'Descending,Ascending',
			limit: jellyfin.getConfigValue('latestMusicSectionItems', 11)
        };
        let moreUri = baseUri + '/albums@parentId=' + collectionId + '@viewType=latest';
        
		return this._getAlbumList(options, jellyfin.getI18n('JELLYFIN_LATEST_MUSIC'), moreUri);
    }

    _getRecentlyPlayed(collectionId, baseUri) {
        let options = {
            parentId: collectionId,
            sortBy: 'DatePlayed,SortName',
            sortOrder: 'Descending,Ascending',
            isPlayed: true,
            limit: jellyfin.getConfigValue('recentlyPlayedSectionItems', 5)
        };
        let moreUri = baseUri + '/songs@parentId=' + collectionId + '@viewType=recentlyPlayed';
        
        return this._getSongList(options, jellyfin.getI18n('JELLYFIN_RECENTLY_PLAYED'), moreUri);
    }

    _getFrequentlyPlayed(collectionId, baseUri) {
        let options = {
            parentId: collectionId,
            sortBy: 'PlayCount,SortName',
            sortOrder: 'Descending,Ascending',
            isPlayed: true,
            limit: jellyfin.getConfigValue('frequentlyPlayedSectionItems', 5)
        };
        let moreUri = baseUri + '/songs@parentId=' + collectionId + '@viewType=frequentlyPlayed';
        
        return this._getSongList(options, jellyfin.getI18n('JELLYFIN_FREQUENTLY_PLAYED'), moreUri);
    }

    _getFavoriteArtists(collectionId, baseUri) {
        let options = {
            parentId: collectionId,
            isFavorite: true,
            limit: jellyfin.getConfigValue('favoriteArtistsSectionItems', 5),
        };
        let moreUri = baseUri + '/artists@parentId=' + collectionId + '@viewType=favorite';

        return this._getArtistList(options, jellyfin.getI18n('JELLYFIN_FAVORITE_ARTISTS'), moreUri);
    }

    _getFavoriteAlbums(collectionId, baseUri) {
        let options = {
            parentId: collectionId,
            isFavorite: true,
            limit: jellyfin.getConfigValue('favoriteAlbumsSectionItems', 5),
        };
        let moreUri = baseUri + '/albums@parentId=' + collectionId + '@viewType=favorite';

        return this._getAlbumList(options, jellyfin.getI18n('JELLYFIN_FAVORITE_ALBUMS'), moreUri);
    }

    _getFavoriteSongs(collectionId, baseUri) {
        let options = {
            parentId: collectionId,
            isFavorite: true,
            limit: jellyfin.getConfigValue('favoriteSongsSectionItems', 5),
        };
        let moreUri = baseUri + '/songs@parentId=' + collectionId + '@viewType=favorite';

        return this._getSongList(options, jellyfin.getI18n('JELLYFIN_FAVORITE_SONGS'), moreUri);
    }

    _getAlbumList(options, title, moreUri) {
        let self = this;
    	let defer = libQ.defer();
    	
        let model = self.getModel('album');
        let parser = self.getParser('album');

		model.getAlbums(options).then( (albums) => {
            let items = [];

            albums.items.forEach( (album) => {
                items.push(parser.parseToListItem(album));
            });

            self._addMoreItem(items, albums.total, moreUri);

            defer.resolve({
                title: title,
                availableListViews: ['list', 'grid'],
            	items: items
            });
		}).fail( (error) => { // return empty list
			defer.resolve({
				items: [],
			});
		});

		return defer.promise;
    }

    _getSongList(options, title, moreUri) {
        let self = this;
    	let defer = libQ.defer();
    	
        let model = self.getModel('song');
        let parser = self.getParser('song');

        model.getSongs(options).then( (songs) => {
            let items = [];

            songs.items.forEach( (song) => {
                items.push(parser.parseToListItem(song));
            });

            self._addMoreItem(items, songs.total, moreUri);

            defer.resolve({
                title: title,
                availableListViews: ['list', 'grid'],
                items: items
            });
        }).fail( (error) => { // return empty list
			defer.resolve({
				items: [],
			});
        });
        
        return defer.promise;
    }

    _getArtistList(options, title, moreUri) {
        let self = this;
    	let defer = libQ.defer();
    	
        let model = self.getModel('artist');
        let parser = self.getParser('artist');

		model.getArtists(options).then( (artists) => {
            let items = [];

            artists.items.forEach( (artist) => {
                items.push(parser.parseToListItem(artist));
            });

            self._addMoreItem(items, artists.total, moreUri);

            defer.resolve({
                title: title,
                availableListViews: ['list', 'grid'],
            	items: items
            });
		}).fail( (error) => { // return empty list
			defer.resolve({
				items: [],
			});
		});

		return defer.promise;
    }

    _addMoreItem(items, total, moreUri) {
        if (items.length < total) {
            items.push(this.constructNextPageItem(moreUri, "<span style='color: #7a848e;'>" + jellyfin.getI18n('JELLYFIN_VIEW_MORE') + "</span>"));
        }
    }

    getSongsOnExplode() {
        let self = this;
        let defer = libQ.defer();

        let collectionId = self.getCurrentView().parentId;
        let model = self.getModel('song');

        let options = {
            parentId: collectionId,
            includeMediaSources: true,
            limit: jellyfin.getConfigValue('maxTracks', 100)
        };

        model.getSongs(options).then( (result) => {
            defer.resolve(result.items);
        }).fail( (error) => {
            defer.reject(error);
        });

        return defer.promise;
    }
}

module.exports = CollectionViewHandler;