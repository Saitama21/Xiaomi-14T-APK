package com.saitama21.motionlab

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Dashboard
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.RocketLaunch
import androidx.compose.material.icons.rounded.TouchApp
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.Vibration
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private val Night = Color(0xFF090B17)
private val Day = Color(0xFFF4F6FC)
private val Accents = listOf(
    Color(0xFF9177FF),
    Color(0xFF41D9C4),
    Color(0xFFFC77A6),
    Color(0xFFFFAD65)
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MotionLab() }
    }
}

@Composable
private fun MotionLab() {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var dark by rememberSaveable { mutableStateOf(true) }
    var colorIndex by rememberSaveable { mutableIntStateOf(0) }
    var power by rememberSaveable { mutableFloatStateOf(0.65f) }
    var haptics by rememberSaveable { mutableStateOf(true) }
    val accent = Accents[colorIndex]
    val bg = if (dark) Night else Day
    val fg = if (dark) Color.White else Color(0xFF131629)
    val scheme = if (dark) darkColorScheme(primary = accent, background = bg, surface = bg)
                 else lightColorScheme(primary = accent, background = bg, surface = bg)
    val haptic = LocalHapticFeedback.current
    fun vibrate() { if (haptics) haptic.performHapticFeedback(HapticFeedbackType.LongPress) }

    MaterialTheme(colorScheme = scheme) {
        Box(Modifier.fillMaxSize().background(bg)) {
            Box(
                Modifier.size(310.dp).offset(x = 190.dp, y = (-130).dp)
                    .background(Brush.radialGradient(listOf(accent.copy(alpha = 0.23f), Color.Transparent)), CircleShape)
            )
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("XIAOMI 14T  /  LAB 01", color = accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.8.sp)
                        Spacer(Modifier.height(6.dp))
                        Text(listOf("Обзор", "Кнопки", "Анимации", "Студия")[tab], color = fg, fontSize = 32.sp, fontWeight = FontWeight.Bold)
                    }
                    Box(Modifier.size(46.dp).clip(CircleShape)
                        .background(accent.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.AutoAwesome, null, tint = accent)
                    }
                }
                AnimatedContent(
                    targetState = tab,
                    transitionSpec = {
                        (fadeIn(tween(230)) + slideInHorizontally(tween(230)) { it / 7 })
                            .togetherWith(fadeOut(tween(130)) + slideOutHorizontally(tween(130)) { -it / 7 })
                    },
                    label = "screen switch"
                ) { page ->
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 10.dp, bottom = 130.dp),
                        verticalArrangement = Arrangement.spacedBy(18.dp)
                    ) {
                        when (page) {
                            0 -> item { Overview(accent, dark, fg, ::vibrate) }
                            1 -> item { ButtonsDemo(accent, dark, fg, power, ::vibrate) }
                            2 -> item { MotionDemo(accent, dark, fg, power, ::vibrate) }
                            else -> item {
                                Studio(accent, dark, fg, colorIndex, { colorIndex = it },
                                    { dark = it }, power, { power = it }, haptics, { haptics = it }, ::vibrate)
                            }
                        }
                    }
                }
            }
            Dock(
                selected = tab,
                accent = accent,
                dark = dark,
                onSelect = { tab = it; vibrate() },
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp)
            )
        }
    }
}

@Composable
private fun Panel(accent: Color, dark: Boolean, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val neutral = if (dark) Color(0xFF171B31) else Color.White
    val edge = if (dark) Color.White.copy(alpha = 0.12f) else Color(0xFF28304E).copy(alpha = 0.09f)
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(28.dp))
            .background(Brush.linearGradient(listOf(neutral, neutral.copy(alpha = 0.94f), accent.copy(alpha = 0.08f))))
            .border(1.dp, edge, RoundedCornerShape(28.dp))
            .padding(22.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        content = { content() }
    )
}

@Composable
private fun SectionLabel(text: String, accent: Color) {
    Text(text.uppercase(), color = accent, letterSpacing = 1.6.sp, fontWeight = FontWeight.Bold, fontSize = 11.sp)
}

@Composable
private fun Overview(accent: Color, dark: Boolean, fg: Color, onHaptic: () -> Unit) {
    Panel(accent, dark) {
        SectionLabel("NATIVE EXPERIENCE", accent)
        Text("Потрогай будущее", color = fg, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, lineHeight = 35.sp)
        Text("Реальные компоненты Android: анимации, физика, жесты и тактильная отдача. Никакого WebView.",
            color = fg.copy(alpha = 0.66f), fontSize = 14.sp, lineHeight = 21.sp)
        Box(Modifier.fillMaxWidth().height(156.dp)
            .clip(RoundedCornerShape(23.dp))
            .background(Brush.linearGradient(listOf(accent.copy(alpha = 0.75f), Color(0xFF5544BA), Color(0xFF1D254E)))),
            contentAlignment = Alignment.Center) {
            Icon(Icons.Rounded.RocketLaunch, null, tint = Color.White, modifier = Modifier.size(84.dp))
        }
        TapButton("ЗАПУСТИТЬ ИМПУЛЬС", accent, onHaptic)
    }
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Metric("120", "FPS READY", accent, dark, fg, Modifier.weight(1f))
        Metric("100%", "OFFLINE", accent, dark, fg, Modifier.weight(1f))
    }
    Panel(accent, dark) {
        SectionLabel("ЖИВЫЕ КОМПОНЕНТЫ", accent)
        Text("Интерфейс реагирует", color = fg, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        Text("Переключай вкладки в нижнем доке, пробуй пружинящие кнопки и двигай карточки пальцем.",
            color = fg.copy(alpha = 0.66f), lineHeight = 21.sp)
        repeat(3) { i ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(listOf(Icons.Rounded.Bolt, Icons.Rounded.TouchApp, Icons.Rounded.Palette)[i], null, tint = accent)
                Text(listOf("Spring physics", "Touch & swipe", "Live customization")[i], color = fg, modifier = Modifier.weight(1f))
                Text("0${i+1}", color = accent.copy(alpha = 0.7f))
            }
        }
    }
}

@Composable
private fun Metric(value: String, label: String, accent: Color, dark: Boolean, fg: Color, modifier: Modifier = Modifier) {
    Panel(accent, dark, modifier) {
        Text(value, color = fg, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
        SectionLabel(label, accent)
    }
}

@Composable
private fun TapButton(text: String, accent: Color, onHaptic: () -> Unit, modifier: Modifier = Modifier) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        if (pressed) 0.92f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "button press"
    )
    Box(
        modifier.fillMaxWidth().graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.horizontalGradient(listOf(accent, accent.copy(alpha = 0.68f))))
            .clickable(interactionSource = interaction, indication = null, onClick = onHaptic)
            .padding(vertical = 18.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = Color(0xFF0B0D1C), fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, letterSpacing = 1.sp)
    }
}

@Composable
private fun ButtonsDemo(accent: Color, dark: Boolean, fg: Color, power: Float, onHaptic: () -> Unit) {
    var count by rememberSaveable { mutableIntStateOf(0) }
    var open by rememberSaveable { mutableStateOf(false) }
    var selection by rememberSaveable { mutableIntStateOf(0) }
    Panel(accent, dark) {
        SectionLabel("HAPTIC INTERACTIONS", accent)
        Text("Каждое нажатие живое", color = fg, fontSize = 23.sp, fontWeight = FontWeight.Bold)
        Text("Нажатий: $count", color = fg.copy(alpha = 0.70f))
        TapButton("НАЖМИ МЕНЯ ✦", accent, { count++; onHaptic() })
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("SOFT", "SPRING", "BOLD").forEachIndexed { index, label ->
                Box(
                    Modifier.weight(1f).clip(RoundedCornerShape(14.dp))
                        .background(if (selection == index) accent.copy(alpha = 0.32f) else fg.copy(alpha = 0.07f))
                        .clickable { selection = index; onHaptic() }.padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                        color = if (selection == index) accent else fg.copy(alpha = 0.65f))
                }
            }
        }
    }
    Panel(accent, dark) {
        SectionLabel("EXPAND / COLLAPSE", accent)
        Text("Карточка-трансформер", color = fg, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp))
                .background(accent.copy(alpha = 0.14f))
                .clickable { open = !open; onHaptic() }
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(if (open) "Свернуть ↑" else "Раскрыть ↓", color = accent, fontWeight = FontWeight.Bold)
            Icon(Icons.Rounded.AutoAwesome, null, tint = accent)
        }
        AnimatedVisibility(visible = open) {
            Text("Этот блок плавно появляется и исчезает. Так можно строить настройки, карточки товаров и меню.",
                color = fg.copy(alpha = 0.74f), lineHeight = 21.sp)
        }
    }
    Panel(accent, dark) {
        SectionLabel("PROGRESS COMPONENT", accent)
        LinearProgressIndicator(progress = { (count % 11) / 10f }, modifier = Modifier.fillMaxWidth().height(9.dp)
            .clip(CircleShape), color = accent, trackColor = accent.copy(alpha = 0.13f))
        Text("Нажимай основную кнопку: прогресс изменится.", color = fg.copy(alpha = 0.6f), fontSize = 12.sp)
    }
}

@Composable
private fun MotionDemo(accent: Color, dark: Boolean, fg: Color, power: Float, onHaptic: () -> Unit) {
    var expanded by rememberSaveable { mutableStateOf(false) }
    val diameter by animateDpAsState(
        if (expanded) 224.dp else 112.dp,
        animationSpec = spring(
            dampingRatio = (0.26f + (1f - power) * 0.55f),
            stiffness = Spring.StiffnessLow + (1f - power) * 480f
        ),
        label = "orb resize"
    )
    val scope = rememberCoroutineScope()
    val offsetX = remember { Animatable(0f) }
    Panel(accent, dark) {
        SectionLabel("SPRING ENGINE", accent)
        Text("Физика движения", color = fg, fontSize = 23.sp, fontWeight = FontWeight.Bold)
        Text("Нажми на сферу — увидишь упругую анимацию.", color = fg.copy(alpha = 0.65f))
        Box(Modifier.fillMaxWidth().height(250.dp), contentAlignment = Alignment.Center) {
            Box(
                Modifier.size(diameter).clip(CircleShape)
                    .background(Brush.radialGradient(listOf(Color.White.copy(alpha = 0.85f), accent, accent.copy(alpha = 0.15f))))
                    .clickable { expanded = !expanded; onHaptic() },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Rounded.AutoAwesome, null, tint = Color(0xFF16142C), modifier = Modifier.size(48.dp))
            }
        }
    }
    Panel(accent, dark) {
        SectionLabel("GESTURE PHYSICS", accent)
        Text("Потяни карточку", color = fg, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Веди её влево или вправо и отпусти. Карточка вернётся с инерцией.",
            color = fg.copy(alpha = 0.67f), lineHeight = 20.sp)
        Box(Modifier.fillMaxWidth().height(145.dp), contentAlignment = Alignment.Center) {
            Box(
                Modifier.fillMaxWidth(0.85f).height(112.dp)
                    .offset { IntOffset(offsetX.value.roundToInt(), 0) }
                    .clip(RoundedCornerShape(22.dp))
                    .background(Brush.horizontalGradient(listOf(accent, Color(0xFF303F83))))
                    .pointerInput(Unit) {
                        detectDragGestures(
                            onDragEnd = {
                                scope.launch {
                                    offsetX.animateTo(0f, spring(dampingRatio = Spring.DampingRatioMediumBouncy))
                                }
                                onHaptic()
                            },
                            onDrag = { change, delta ->
                                change.consume()
                                scope.launch { offsetX.snapTo((offsetX.value + delta.x).coerceIn(-320f, 320f)) }
                            }
                        )
                    },
                contentAlignment = Alignment.Center
            ) {
                Text("←   DRAG ME   →", fontWeight = FontWeight.ExtraBold, color = Color.White, letterSpacing = 2.sp)
            }
        }
    }
}

@Composable
private fun Studio(
    accent: Color, dark: Boolean, fg: Color,
    index: Int, onIndex: (Int) -> Unit,
    onDark: (Boolean) -> Unit,
    power: Float, onPower: (Float) -> Unit,
    haptics: Boolean, onHaptics: (Boolean) -> Unit,
    onHaptic: () -> Unit
) {
    Panel(accent, dark) {
        SectionLabel("APPEARANCE", accent)
        Text("Настрой свой интерфейс", color = fg, fontSize = 23.sp, fontWeight = FontWeight.Bold)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(if (dark) Icons.Rounded.DarkMode else Icons.Rounded.LightMode, null, tint = accent)
            Spacer(Modifier.width(12.dp))
            Text(if (dark) "Тёмная тема" else "Светлая тема", color = fg, modifier = Modifier.weight(1f))
            Switch(checked = dark, onCheckedChange = { onDark(it); onHaptic() })
        }
        SectionLabel("ACCENT COLORS", accent)
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Accents.forEachIndexed { i, color ->
                Box(Modifier.size(if (index == i) 52.dp else 47.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(if (index == i) 3.dp else 0.dp, fg.copy(alpha = 0.8f), CircleShape)
                    .clickable { onIndex(i); onHaptic() },
                    contentAlignment = Alignment.Center) {
                    if (index == i) Text("✓", color = Color(0xFF16152A), fontSize = 22.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
    Panel(accent, dark) {
        SectionLabel("MOTION CONTROLS", accent)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Упругость анимации", color = fg, fontWeight = FontWeight.SemiBold)
            Text("${(power * 100).roundToInt()}%", color = accent, fontWeight = FontWeight.Bold)
        }
        Slider(value = power, onValueChange = onPower, valueRange = 0f..1f)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.Vibration, null, tint = accent)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Виброотклик", color = fg, fontWeight = FontWeight.SemiBold)
                Text("Тактильный ответ при нажатиях", color = fg.copy(alpha = 0.56f), fontSize = 12.sp)
            }
            Switch(checked = haptics, onCheckedChange = { onHaptics(it) })
        }
    }
    Panel(accent, dark) {
        SectionLabel("ABOUT", accent)
        Text("Motion Lab · 1.0.0", color = fg, fontWeight = FontWeight.Bold, fontSize = 20.sp)
        Text("Kotlin • Jetpack Compose • Android native\nБез интернета. Все настройки работают прямо в приложении.",
            color = fg.copy(alpha = 0.62f), fontSize = 13.sp, lineHeight = 21.sp)
    }
}

@Composable
private fun Dock(selected: Int, accent: Color, dark: Boolean, onSelect: (Int) -> Unit, modifier: Modifier = Modifier) {
    val icons = listOf(Icons.Rounded.Dashboard, Icons.Rounded.TouchApp, Icons.Rounded.AutoAwesome, Icons.Rounded.Tune)
    val titles = listOf("Обзор", "Кнопки", "Motion", "Студия")
    val bg = if (dark) Color(0xFF23263C) else Color(0xFFFCFCFF)
    Row(
        modifier.fillMaxWidth(0.89f).height(76.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(bg.copy(alpha = 0.98f))
            .border(1.dp, if (dark) Color.White.copy(alpha = 0.18f) else Color.Black.copy(alpha = 0.08f),
                RoundedCornerShape(28.dp))
            .padding(horizontal = 8.dp, vertical = 9.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically
    ) {
        icons.forEachIndexed { i, icon ->
            val active = i == selected
            Column(
                Modifier.weight(1f).fillMaxSize()
                    .clip(RoundedCornerShape(19.dp))
                    .background(if (active) accent.copy(alpha = 0.18f) else Color.Transparent)
                    .clickable { onSelect(i) },
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(icon, contentDescription = titles[i],
                    tint = if (active) accent else if (dark) Color(0xFF9A9CB4) else Color(0xFF676A82),
                    modifier = Modifier.size(23.dp))
                Text(titles[i], fontSize = 10.sp, fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                    color = if (active) accent else if (dark) Color(0xFF9A9CB4) else Color(0xFF676A82))
            }
        }
    }
}
