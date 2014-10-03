/*global module:false*/
module.exports = function(grunt) {
	var fs = require('fs'),
		xml2js = require('xml2js'),
		app = require(process.cwd() + '/.project.json'),
		os = process.platform,
		root = process.cwd() + "/../HybridApp";

	var files = {
		global : {
			projectJson : function() {
				return root + "/www/.project.json";
			},
			configXml : function() {
				return root + "/config.xml";
			}
		},
		ios : {
			projectJson : function() {
				return root + "/platforms/ios/www/.project.json";
			},
			configXml : function() {
				return root + "/platforms/ios/" + app.deployment.appname + "/config.xml";
			}
		},
		android : {
			projectJson : function() {
				return root + "/platforms/android/assets/www/.project.json";
			},
			configXml : function() {
				return root + "/platforms/android/res/xml/config.xml";
			}
		}
	};

	var config = {
		parser : new xml2js.Parser(),
		builder : new xml2js.Builder(),
		platformPrefs : function(platform, prefs) {
			var configFile = files[platform].configXml();
			var content = fs.readFileSync(configFile);
			var jsContent = null;
			this.parser.parseString(content, function (err, result) {
				jsContent = result;
			});

			if (jsContent && prefs) {
				var obj = jsContent.widget.preference ? jsContent.widget.preference : [];
				for (var p in prefs) {
					obj.push({ "$": {"name" : p, "value": prefs[p]} });
                    for (var i=0; i<obj.length-1; i++) {
                        if (p.toLowerCase() === obj[i].$.name.toLowerCase()) {
                            obj[i].$.value = prefs[p];
                            obj.pop();
                        }
                    }
				}
				jsContent.widget.preference = obj;
			}

			var xml = this.builder.buildObject(jsContent);
			fs.writeFileSync(configFile, xml);
		},
		appInfo : function() {
			var configFile = files.global.configXml();
			var content = fs.readFileSync(configFile);
			var jsContent = null;
			this.parser.parseString(content, function (err, result) {
				jsContent = result;
			});

			if (jsContent) {
				jsContent.widget.description = app.deployment.appdesc;
				jsContent.widget.$.version = app.deployment.appversion;
				jsContent.widget.author[0]._ = "\n  SAP P and I Team\n  ";
				jsContent.widget.author[0].$.email = "dev@sap.com";
				jsContent.widget.author[0].$.href = "http://www.sap.com";
			}

			var xml = this.builder.buildObject(jsContent);
			fs.writeFileSync(configFile, xml);
		}
	};

	var projectJson = {
		copyfile : function(platform) {
			var sourceFile = files.global.projectJson();
			var targetFile = files[platform].projectJson();
			fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
		}
	};

	var platformList = {
		get : function() {
			var platforms = [];
			for (var p in app.deployment.platform) {
				if (p === 'ios') {
					if (app.deployment.platform[p].selected && os === 'darwin') {
						platforms.push(p);
					}
				} else {
					if (app.deployment.platform[p].selected) {
						platforms.push(p);
					}
				}
			}
			return platforms;
		}
	};
    
	var hooks = {
		afterprepare : function() {
			fs.mkdirSync(root + "/hooks/after_prepare");
			fs.writeFileSync(root + '/hooks/after_prepare/config_files.js', "#!/usr/bin/env node\n\n");
			var dir = process.cwd().split("\\");
			var setBaseCmd = "process.chdir('" + dir.join("/") + "');"
			fs.appendFileSync(root + '/hooks/after_prepare/config_files.js', setBaseCmd + "\n");
			var runTaskCmd = "require('child_process').exec('grunt -v afterprepare');";
			fs.appendFileSync(root + '/hooks/after_prepare/config_files.js', runTaskCmd);
            if (os === 'darwin') {
                fs.chmodSync(root + '/hooks/after_prepare/config_files.js', 0755);
            }
		}
	};

	// Project configuration.
	grunt.initConfig({
		platform : null,
		plugin : null,
        listplatform : null,
		searchpath : null,
		password : null,
		copy: {
			www: {
				files : [{
					expand: true,
					src: ['**/*.*','.project.json','!node_modules/**/*.*','!Gruntfile.js','!package.json','!**/*-dbg.js'],
					dest: root + "/www"
				}]
			}
		},
		clean: {
			options: {
				force: true
			},
			www: [root + "/www"],
			hooks: [root + "/hooks/*"],
			app: [root]
		},
		concat: {
			options: {
				banner:  '<%= meta.banner %>' + '// GENERATED FILE - DO NOT EDIT\n'
			},
			dist: {}
		},
		shell: {
			options: {
				failOnError: true,
				stdout: false,
				stderr: true
			},
			debug : {
				command: ['cordova build <%= platform %>', 'cordova emulate <%= platform %>']
			},
			create: {
				command: 'cordova -d create ' + root + ' ' + app.deployment.appid + ' ' + app.deployment.appname
			},
			addplatform : {
				command: 'cordova -d platform add <%= platform %>'
			},
			addplugin : {
				command: 'cordova -d plugin add <%= plugin %> <%= searchpath %>'
			},
            prepare: {
				command: 'cordova -d prepare <%= platform %>'
            },
			build: {
				command: 'cordova -d build <%= platform %>'
			},
			emulate: {
				command: 'cordova -d emulate <%= platform %>'         
			},
			runondevice : {
				command: 'cordova -d run <%= platform %>'
			},
			deploy : {
				command: [
					'kapsel package',
					'kapsel deploy ' + app.deployment.appid + ' ' + app.deployment.server + ' ' + app.deployment.adminuser + ' ' + '<%= password %>'
				].join('&&')
			}
		},
		prompt: {
			smp: {
				options: {
					questions: [{
						config: 'smp.options.reporter', // arbitray name or config for any other grunt task
						type: 'password', // list, checkbox, confirm, input, password
						message: 'Please key in the password for SMP user - ' + app.deployment.adminuser + ':', // Question to ask the user, function needs to return a string,
						default: '', // default value if nothing is entered
						validate: function(value) {
							//console.log('validate password = ' + value);
							grunt.config.set('password', value);
							return true;
						}
					}]
				}
			}
		}
	});

	// Load dependencies
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-init');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-prompt');

	grunt.registerTask('setworkdir','Move to the folder where the hybrid app is created', function() {
        grunt.file.setBase(root);
    });

	// Create Project tasks
	grunt.registerTask('configapp','Apply information to Config.xml', function() {
        config.appInfo();
    });
	grunt.registerTask('confighooks','create hooks', function() {
        hooks.afterprepare();
    });
	grunt.registerTask('createapp','Create a new cordova project', function() {
		grunt.task.run('clean:app');
		grunt.task.run('shell:create');
		grunt.task.run('configapp');
		grunt.task.run('copy:www');
        grunt.task.run('clean:hooks');
        grunt.task.run('confighooks');
	});

    // Add Platforms
	grunt.registerTask('addplatform','Add a platform to the project', function(platform) {
		grunt.config.set('platform', platform);
		grunt.task.run('shell:addplatform');
	});
	grunt.registerTask('addplatforms','Process to add platforms', function() {
        var platforms = platformList.get();
        for (var i=0; i<platforms.length; i++) {
            grunt.task.run('addplatform:' + platforms[i]);
        }
	});

    // Add Plugins
	grunt.registerTask('addcordovaplugin','Add Cordova plugin to the project', function(registry) {
		grunt.config.set("plugin", registry);
		grunt.task.run('shell:addplugin');
	});
	grunt.registerTask('addkapselplugin','Add Kapsel plugin to the project', function(registry) {
		grunt.config.set("plugin", registry);
		grunt.config.set("searchpath", '--searchpath ' + process.env.KAPSEL_HOME + 'plugins/');
		grunt.task.run('shell:addplugin');
	});
	grunt.registerTask('addplugins','Add plugins to the project', function() {
		for (var p in app.deployment.plugins.cordova) {
			if (app.deployment.plugins.cordova[p].selected) {
				grunt.task.run('addcordovaplugin:' + app.deployment.plugins.cordova[p].registry);
			}
		}
		for (var p in app.deployment.plugins.kapsel) {
			if (app.deployment.plugins.kapsel[p].selected) {
				grunt.task.run('addkapselplugin:' + app.deployment.plugins.kapsel[p].registry);
			}
		}
	});

    // Prepare and Package Projects, Customize config.xml and project.json
	grunt.registerTask('projectjson','Copy project.json to individual platform', function(platform) {
		projectJson.copyfile(platform);
	});
	grunt.registerTask('configplatform','Add preferences in individual platform Configuration XML', function(platform) {
		var prefs = app.deployment.platform[platform].preferences;
		config.platformPrefs(platform, prefs);
	});
	grunt.registerTask('afterprepare','Customize config.xml and project.json after prepare', function() {
        var platforms = platformList.get();
        for (var i=0; i<platforms.length; i++) {
            grunt.task.run('configplatform:' + platforms[i]);
            grunt.task.run('projectjson:' + platforms[i]);
        }
    });

    // Standalone commands
	grunt.registerTask('build','Prepare and compile platform projects', function() {
		grunt.task.run('setworkdir');
		grunt.task.run('shell:build');
	});
	grunt.registerTask('emulate','Run application on emulator', function() {
		grunt.task.run('setworkdir');
		grunt.task.run('shell:emulate');
	});
	grunt.registerTask('run','Run application on connected device', function() {
		grunt.task.run('setworkdir');
		grunt.task.run('shell:runondevice');
	});
	grunt.registerTask('deploy','Deploy platform projects to SMP', function() {
		grunt.task.run('prompt:smp');
		grunt.task.run('setworkdir');
		grunt.task.run('shell:deploy');
	});

    // future improvements
	grunt.registerTask('update','Pull latest changes from Git, build and deploy', function() {
		//grunt.task.run('gitpull');
		//grunt.task.run('npm-install');
		//grunt.task.run('clean');
		//grunt.task.run('copywww');
		//grunt.task.run('gotohybridapp');
		//grunt.task.run('deploy');
	});
	grunt.registerTask('debug','Create a debug build', function(platform) {
		grunt.task.run('jshint','concat','min');
		grunt.config.set("platform", platform);
		grunt.task.run('shell:debug');
	});

	// Default task
	grunt.registerTask('default', function() {
		grunt.task.run('createapp');
		grunt.task.run('setworkdir');
		grunt.task.run('addplatforms');
		grunt.task.run('addplugins');
		grunt.task.run('shell:prepare');
	});

};