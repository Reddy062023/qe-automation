package runner;

import com.intuit.karate.junit5.Karate;

class TestRunner {

    @Karate.Test
    Karate testAll() {
        // Tell Karate exactly where the feature files are
        // classpath:features maps to src/test/resources/features/
        return Karate.run("classpath:features").relativeTo(getClass());
    }

}