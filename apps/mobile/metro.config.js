// İçerik kütüphanesi (repo kökündeki content/) uygulamayla paylaşılıyor.
// Metro'nun proje dışındaki bu klasörü izleyip paketleyebilmesi için ekliyoruz.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../content')];

module.exports = config;
