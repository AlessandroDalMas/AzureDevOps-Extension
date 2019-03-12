# Introduction 
AzureDevOps-Extension is an example for integration in pipelines about T-SQL Analysis.

# Getting Started
##	Installation process

1. Install node packets typescript and tfx-cli:

    ```npm i -g typescript tfx-cli```

2. Install node packets in root and for each ```./Tasks/```

    ```npm i -g typescript tfx-cli```

##	Software dependencies

1. nodejs
2. azure-pipelines-task-lib: 2.7.7
3. vss-web-extension-sdk: 5.141.0

##  Latest releases

1. 1.1.4 - 12-03-2019
2. 1.0.50 - 07-11-2018
3. 1.0.0 - 30-10-2018.

# Build and Test

1. Compile all ts with: ```tsc -p . --resolveJsonModule```
2. Build the vsix file: ```tfx extension create --manifests vss-extension.json --rev-version```

# Known problems

1. Duplicated node_modules folder
2. Missing translations from Italian language
3. Compiling errors from typescript, but it still compiles

# To be implemented

1. Missing unit test
2. Resolve typescript conflicts
