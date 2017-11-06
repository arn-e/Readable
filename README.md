# Readable

### Readability Scoring Widget for Enonic XP

## Description 

Analyzes text fields in an Enonic XP site, and returns a readable score.
The readable score is derived from a combination of the following metrics :

* Flesch-Kincaid 
* Coleman-Liau
* Syllables over words
* Syllables over sentences

## Releases and Compatibility

| App version | Required XP version |
| ----------- | ------------------- |
| 1.0.0 | 6.10.3 |
| 1.0.1 | 6.10.3 |
| 1.0.2 | 6.10.3 |

## Building and deploying

Build this application from the command line. Go to the root of the project and enter:

    ./gradlew clean build

To deploy the app, set `$XP_HOME` environment variable and enter:

    ./gradlew deploy
    
## Resources

* https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests
* https://en.wikipedia.org/wiki/Coleman%E2%80%93Liau_index
