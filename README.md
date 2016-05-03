# May 1 Reboot WebGL Globe

This project contains the WebGL globe that runs in the header of the [May 1 Reboot showcase](http://www.may1reboot.com/). It uses [THREE.js](http://threejs.org/) for rendering and [GSAP](http://greensock.com/gsap) for animations. The globe is interactive and works on mobile as well as desktop.  

## Dependencies

- Node.js (0.12+)
- [Gulp.js](http://gulpjs.com/)
- [Bower](http://bower.io/)

## Get up and running

1. Install dependencies:

  - Node.js (using [homebrew](http://brew.sh/)):

    ```sh
    brew install node
    ```

  - Gulp.js

    ```sh
    npm install -g gulp
    ```

  - Bower

    ```sh
    npm install -g bower
    ```

  - Surge (optional)

    ```sh
    npm install -g surge
    ```

2. Install modules

  ```sh
  npm install
  ```

3. Start development server

  ```sh
  gulp
  ```

4. Goto [http://localhost:3000](http://localhost:3000) and amaze :beer:

Alternatively, run the following for a live reload server 

  ```sh
  gulp live
  ```
