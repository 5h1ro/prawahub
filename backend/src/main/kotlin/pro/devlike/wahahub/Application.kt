package pro.devlike.wahahub

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import pro.devlike.wahahub.plugins.*

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    configureSockets()
    configureSerialization()
    configureDatabases()
    configureMonitoring()
    configureHTTP()
    configureSecurity()
    configureRouting()
}
