const gulp = require('gulp');

function buildIcons() {
  return gulp.src('icons/**/*').pipe(gulp.dest('dist/icons'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;
