
const path = require('path');

module.exports = {
	entry: './ts_source/main.ts',
	devtool: 'source-map',
	module: {
		rules: [
			{
				test: /\.tsx?$/, // *.ts/*.tsx
				use: [
					{
						loader: 'ts-loader',
						options: {
							transpileOnly: true
						}
					}
				],
				exclude: /node_modules/,
			},
			{
				test: /\.js$/,
				loader: 'eslint',
				include: /ts_source/,
				exclude: [
					/node_modules/,
					/webpack.config.js/
				]
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'scripts')
	}
};
