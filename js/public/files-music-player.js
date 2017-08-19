/**
 * ownCloud - Music app
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Pauli Järvinen <pauli.jarvinen@gmail.com>
 * @copyright Pauli Järvinen 2017
 */

$(document).ready(function () {

	var player = new PlayerWrapper();
	player.setVolume(50);
	var currentFile = null;
	var playing = false;
	var shareView = false;

	// UI elements (jQuery)
	var musicControls = null;
	var playButton = null;
	var pauseButton = null;
	var coverImage = null;
	var titleText = null;

	function togglePlayback() {
		player.togglePlayback();
		playing = !playing;

		if (playing) {
			playButton.css('display', 'none');
			pauseButton.css('display', 'inline-block');
		} else {
			playButton.css('display', 'inline-block');
			pauseButton.css('display', 'none');
		}
	}

	function stop() {
		player.stop();
		musicControls.css('display', 'none');
		currentFile = null;
	}

	function createPlayButton() {
		return $(document.createElement('img'))
			.attr('id', 'play')
			.attr('class', 'control svg')
			.attr('src', OC.imagePath('music', 'play-big'))
			.attr('alt', t('music', 'Play'))
			.css('display', 'inline-block')
			.click(togglePlayback);
	}

	function createPauseButton() {
		return $(document.createElement('img'))
			.attr('id', 'pause')
			.attr('class', 'control svg')
			.attr('src', OC.imagePath('music', 'pause-big'))
			.attr('alt', t('music', 'Pause'))
			.css('display', 'none')
			.click(togglePlayback);
	}

	function createCoverImage() {
		return $(document.createElement('div')).attr('id', 'albumart');
	}

	function createTitleText() {
		return $(document.createElement('span')).attr('id', 'title');
	}

	function createProgressInfo() {
		var container = $(document.createElement('div')).attr('class', 'progress-info');

		var text = $(document.createElement('span')).attr('class', 'progress-text');

		var seekBar = $(document.createElement('div')).attr('class', 'seek-bar');
		var playBar = $(document.createElement('div')).attr('class', 'play-bar');
		var bufferBar = $(document.createElement('div')).attr('class', 'buffer-bar');

		seekBar.append(playBar);
		seekBar.append(bufferBar);

		container.append(text);
		container.append(seekBar);

		var playTime_s = 0;
		var songLength_s = 0;

		function formatTime(seconds) {
			var minutes = Math.floor(seconds/60);
			seconds = Math.floor(seconds - (minutes * 60));
			return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
		}

		function updateProgress() {
			var ratio = 0;
			if (songLength_s == 0) {
				text.text(t('music', 'Loading...'));
			} else {
				text.text(formatTime(playTime_s) + '/' + formatTime(songLength_s));
				ratio = playTime_s / songLength_s;
			}
			playBar.css('width', 100 * ratio + '%');
		}

		player.on('loading', function () {
			playTime_s = 0;
			songLength_s = 0;
			updateProgress();
			bufferBar.css('width', '0');
		});
		player.on('buffer', function (percent) {
			bufferBar.css('width', Math.round(percent) + '%');
		});
		player.on('progress', function (msecs) {
			playTime_s = Math.round(msecs/1000);
			updateProgress();
		});
		player.on('duration', function(msecs) {
			songLength_s = Math.round(msecs/1000);
			updateProgress();
		});

		return container;
	}

	function createVolumeControl() {
		var volumeControl = $(document.createElement('div'))
			.attr('class', 'volume-control');

		var volumeIcon = $(document.createElement('img'))
			.attr('id', 'volume-icon')
			.attr('class', 'control small svg')
			.attr('src', OC.imagePath('music', 'sound'));

		var volumeSlider = $(document.createElement('input'))
			.attr('id', 'volume-slider')
			.attr('min', '0')
			.attr('max', '100')
			.attr('type', 'range')
			.on('input', function() {
				player.setVolume($(this).val());
			});

		volumeControl.append(volumeIcon);
		volumeControl.append(volumeSlider);

		return volumeControl;
	}

	function createCloseButton() {
		return $(document.createElement('img'))
			.attr('id', 'close')
			.attr('class', 'control small svg')
			.attr('src', OC.imagePath('music', 'close'))
			.attr('alt', t('music', 'Close'))
			.click(stop);
	}

	function createUi() {
		musicControls = $(document.createElement('div')).attr('id', 'music-controls');

		playButton = createPlayButton();
		pauseButton = createPauseButton();
		coverImage = createCoverImage();
		titleText = createTitleText();

		musicControls.append(playButton);
		musicControls.append(pauseButton);
		musicControls.append(coverImage);
		musicControls.append(titleText);
		musicControls.append(createProgressInfo())
		musicControls.append(createVolumeControl());
		musicControls.append(createCloseButton());

		var parentContainer = $('div#app-content');
		if (parentContainer.length === 0) {
			shareView = true;
			parentContainer = $('div#preview');
			musicControls.css('left', '0');
		}
		parentContainer.append(musicControls);

		// resize music controls bar to fit the scroll bar when window size changes or details pane opens/closes
		var resizeControls = function() {
			musicControls.css('width', parentContainer.innerWidth() - getScrollBarWidth() + 'px');
		};
		parentContainer.resize(resizeControls);
		resizeControls();

		player.on('end', stop);
	}

	function showMusicControls() {
		if (!musicControls) {
			createUi();
		}
		musicControls.css('display', 'inline-block');
	}

	function appendRequestToken(url) {
		var delimiter = url.includes('?') ? '&' : '?';
		return url + delimiter + 'requesttoken=' + encodeURIComponent(OC.requestToken);
	}

	function initPlayer(url, mime, title, cover) {
		if (!shareView) {
			url = appendRequestToken(url);
		}
		player.fromURL(url, mime);
		coverImage.css('background-image', cover);
		titleText.text(title);
	}

	// Handle 'play' action on file row
	function onFilePlay(filename, context) {
		showMusicControls();

		// Check if playing file changes
		var filerow = context.$file;
		if (currentFile != filerow.attr('data-id')) {
			currentFile = filerow.attr('data-id');
			player.stop();
			playing = false;

			initPlayer(
					context.fileList.getDownloadUrl(filename, context.dir),
					filerow.attr('data-mime'),
					filename,
					filerow.find('.thumbnail').css('background-image')
			);
		}

		// Play/Pause
		togglePlayback();
	}

	// add play action to file rows with mime type 'audio/*'
	OCA.Files.fileActions.register(
			'audio',
			'music-play',
			OC.PERMISSION_READ,
			OC.imagePath('music', 'play-big'),
			onFilePlay,
			t('music', 'Play')
	);
	OCA.Files.fileActions.setDefault('audio', 'music-play');

	// on single-file-share page, add click handler to the file preview if it is an audio file
	if ($('#header').hasClass('share-file')) {
		var mime = $('#mimetype').val();
		if (mime.startsWith('audio')) {

			// The #publicpreview is added dynamically by another script.
			// Augment it with the click handler once it gets added.
			$.initialize('img.publicpreview', function() {
				$(this).css('cursor', 'pointer');
				$(this).click(function() {
					showMusicControls();
					if (!currentFile) {
						currentFile = 1; // bogus id

						initPlayer(
								$('#downloadURL').val(),
								mime,
								$('#filename').val(),
								'url(' + $(this).attr('src') + ')'
						);
					}
					togglePlayback();
				});
			});
		}
	}

	return true;
});
