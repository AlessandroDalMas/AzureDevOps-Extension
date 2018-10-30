# Introduction 
AzureDevOps-Extension is an example for integration in pipelines about T-SQL Analysis.

# Getting Started
##	Installation process

1. Instal node packets typescript and tfx-cli:

    ```npm i -g typescript tfx-cli```

##	Software dependencies

1. nodejs: ^10.12.0
2. azure-pipelines-task-lib: ^2.7.0
3. vss-web-extension-sdk: ^4.126.2

##  Latest releases

1. 1.0 - 30-10-2018.

# Build and Test

1. ```tsc -p . --resolveJsonModule```
2. ```tfx extension create --manifests vss-extension.json --rev-version```

# Known problems

1. Duplicated node_modules folder
2. Missing translations from Italian language
3. Compiling errors from typescript, but it still compiles
4. I was not able to use the charts offered by microsoft, so imported Chartjs library
5. Related to point 4, there are typescript errors because I did not import the types
6. To compile index.ts you need to modify the tsconfig.json. Need to uncomment the file, comment other files, and change module to "commonjs"

# To be implemented

1. Missing unit test
2. Resolve typescript conflicts
3. Resolve different compiling rules for task and tabs
4. vss-extension.json to be updated
5. Migration to new azure web extension library
